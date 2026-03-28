import type { Plugin } from "@opencode-ai/plugin"
import { createDiscordClient } from "./discord-client"
import { createConnectionState } from "./state"
import { createInboundBridge } from "./bridge-inbound"
import { createOutboundBridge } from "./bridge-outbound"
import { createSystemPromptHook } from "./system-prompt"
import { buildAgentEmbed, buildAgentButtons } from "./agent-display"
import type { DiscordClientWrapper } from "./discord-client"
import type { ConnectionStateManager } from "./state"
import type { AgentInfo } from "./types"
import { textPart } from "./types"



let activeDiscordClient: DiscordClientWrapper | null = null
let activeState: ConnectionStateManager | null = null

let activeEventHandler: ((event: any) => Promise<void>) | null = null

const plugin: Plugin = async (ctx) => {
  if (activeDiscordClient) {
    await activeDiscordClient.disconnect().catch(() => {})
    activeDiscordClient = null
  }
  if (activeState) {
    activeState.disconnect()
    activeState = null
  }
  activeEventHandler = null

  const discordClient = createDiscordClient()
  const state = createConnectionState()
  activeDiscordClient = discordClient
  activeState = state

  const fs = require("fs")
  const logFile = "/tmp/opencode-discord-channel.log"
  function log(msg: string) {
    try { fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`) } catch {}
  }

  async function promptSession(params: {
    sessionID: string
    agent?: string
    parts: unknown[]
  }): Promise<void> {
    log(`[promptSession] sessionID=${params.sessionID}`)

    const body: Record<string, unknown> = { parts: params.parts }
    if (params.agent) body.agent = params.agent

    try {
      const result = await (ctx.client as any).session.promptAsync({
        path: { id: params.sessionID },
        body,
      })
      log(`[promptSession] result: ${JSON.stringify(result).slice(0, 500)}`)
    } catch (err) {
      log(`[promptSession] promptAsync threw: ${err}`)
      try {
        const result = await (ctx.client as any).session.prompt({
          path: { id: params.sessionID },
          body: { parts: params.parts },
        })
        log(`[promptSession] prompt fallback: ${JSON.stringify(result).slice(0, 500)}`)
      } catch (err2) {
        log(`[promptSession] prompt also threw: ${err2}`)
        throw err2
      }
    }
  }

  async function fetchAgents(): Promise<AgentInfo[]> {
    try {
      const result = await ctx.client.app.agents()
      const agents = result.data ?? []
      return agents.map((a: any) => ({
        name: a.name,
        mode: (a.mode ?? "primary") as AgentInfo["mode"],
        color: a.color,
        description: a.description,
      }))
    } catch {
      return []
    }
  }

  const outboundHandler = createOutboundBridge({
    discordClient,
    state,
    agentDisplay: { buildAgentEmbed, buildAgentButtons },
    fetchAgents,
  })
  activeEventHandler = outboundHandler

  const systemPromptHook = createSystemPromptHook(state)

  return {
    async config(config) {
      config.command = config.command ?? {}
      config.command["dc:connect"] = {
        template: "[opencode-discord-channel plugin: bridge connected to $ARGUMENTS]",
        description: "(plugin: discord-channel) Connect Discord bridge to a channel",
      }
      config.command["dc:disconnect"] = {
        template: "[opencode-discord-channel plugin: bridge disconnected]",
        description: "(plugin: discord-channel) Disconnect Discord bridge",
      }
      config.command["dc:status"] = {
        template: "[opencode-discord-channel plugin: status check]",
        description: "(plugin: discord-channel) Show Discord bridge connection status",
      }
      config.command["dc:disconnect"] = {
        template: "Disconnect Discord bridge",
        description: "(plugin: discord-channel) Disconnect Discord bridge",
      }
      config.command["dc:status"] = {
        template: "Check Discord bridge status",
        description:
          "(plugin: discord-channel) Show Discord bridge connection status",
      }
    },

    async "command.execute.before"(input, output) {
      const { command, sessionID, arguments: args } = input

      if (command === "dc:connect") {
        const token = process.env.DISCORD_BOT_TOKEN
        if (!token) {
          output.parts = [
            textPart(
              "Error: DISCORD_BOT_TOKEN environment variable is not set. Please set it before connecting.",
            ),
          ]
          return
        }

        const channelId = args.trim()
        if (!channelId) {
          output.parts = [
            textPart(
              "Error: Please provide a Discord channel ID. Usage: /dc:connect <channel_id>",
            ),
          ]
          return
        }

        const ownerId = process.env.DISCORD_OWNER_ID
        if (!ownerId) {
          output.parts = [
            textPart(
              "Error: DISCORD_OWNER_ID environment variable is not set. Only the bot owner can interact.",
            ),
          ]
          return
        }

        try {
          await discordClient.connect(token)
          state.connect({
            botToken: token,
            ownerId,
            channelId,
            sessionId: sessionID,
          })

          const channelValid = await discordClient.validateChannel(channelId)
          if (!channelValid) {
            await discordClient.disconnect().catch(() => {})
            state.disconnect()
            output.parts = [
              textPart(
                `Error: Channel ${channelId} not found or bot lacks access.`,
              ),
            ]
            return
          }

          state.setBotUserId(discordClient.getBotUserId() ?? "")

          createInboundBridge({
            discordClient,
            state,
            sessionPrompt: async (params) => {
              await promptSession({
                sessionID: params.sessionID,
                agent: params.agent,
                parts: params.parts.map((part) => textPart(part.text)),
              })
            },
            onAgentSwitch: async (agentName) => {
              state.setCurrentAgent(agentName)
              await promptSession({
                sessionID: state.getSessionId()!,
                agent: agentName,
                parts: [textPart(`(Agent switched to ${agentName} via Discord)`)],
              }).catch(() => {})
            },
          })

          output.parts = [
            textPart(
              `Discord bridge connected to channel ${channelId}. Messages from this channel will appear here.`,
            ),
          ]
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error"
          output.parts = [textPart(`Failed to connect Discord bot: ${msg}`)]
        }
        return
      }

      if (command === "dc:disconnect") {
        await discordClient.disconnect().catch(() => {})
        state.disconnect()
        output.parts = [textPart("Discord bridge disconnected.")]
        return
      }

      if (command === "dc:status") {
        const s = state.getState()
        const statusText = s.connected
          ? `Connected to channel ${s.channelId} (session: ${s.sessionId}, agent: ${s.currentAgent ?? "default"})`
          : "Not connected."
        output.parts = [textPart(`Discord bridge status: ${statusText}`)]
        return
      }
    },

    async event({ event }) {
      if (activeEventHandler) {
        await activeEventHandler(event)
      }
    },

    async "experimental.chat.system.transform"(input, output) {
      await systemPromptHook(input, output)
    },
  }
}

export default plugin
