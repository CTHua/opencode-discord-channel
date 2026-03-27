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
        template: "Connect Discord bot to channel $ARGUMENTS",
        description:
          "(plugin: discord-channel) Connect Discord bridge to a channel",
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
            {
              type: "text",
              text: "Error: DISCORD_BOT_TOKEN environment variable is not set. Please set it before connecting.",
            } as any,
          ]
          return
        }

        const channelId = args.trim()
        if (!channelId) {
          output.parts = [
            {
              type: "text",
              text: "Error: Please provide a Discord channel ID. Usage: /dc:connect <channel_id>",
            } as any,
          ]
          return
        }

        const ownerId = process.env.DISCORD_OWNER_ID
        if (!ownerId) {
          output.parts = [
            {
              type: "text",
              text: "Error: DISCORD_OWNER_ID environment variable is not set. Only the bot owner can interact.",
            } as any,
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
          state.setBotUserId(discordClient.getBotUserId() ?? "")

          createInboundBridge({
            discordClient,
            state,
            sessionPrompt: async (params) => {
              await (ctx.client.session.promptAsync as any)
                ({
                  sessionID: params.sessionID,
                  agent: params.agent,
                  parts: params.parts as any,
                })
                .catch(async () => {
                  await (ctx.client.session.prompt as any)({
                    sessionID: params.sessionID,
                    parts: params.parts as any,
                  })
                })
            },
            onAgentSwitch: async (agentName) => {
              state.setCurrentAgent(agentName)
              await (ctx.client.session.promptAsync as any)
                ({
                  sessionID: state.getSessionId()!,
                  agent: agentName,
                  parts: [
                    {
                      type: "text",
                      text: `(Agent switched to ${agentName} via Discord)`,
                    },
                  ] as any,
                })
                .catch(() => {})
            },
          })

          output.parts = [
            {
              type: "text",
              text: `Discord bridge connected to channel ${channelId}. Messages from this channel will appear here.`,
            } as any,
          ]
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error"
          output.parts = [
            {
              type: "text",
              text: `Failed to connect Discord bot: ${msg}`,
            } as any,
          ]
        }
        return
      }

      if (command === "dc:disconnect") {
        await discordClient.disconnect().catch(() => {})
        state.disconnect()
        output.parts = [
          {
            type: "text",
            text: "Discord bridge disconnected.",
          } as any,
        ]
        return
      }

      if (command === "dc:status") {
        const s = state.getState()
        const statusText = s.connected
          ? `Connected to channel ${s.channelId} (session: ${s.sessionId}, agent: ${s.currentAgent ?? "default"})`
          : "Not connected."
        output.parts = [
          {
            type: "text",
            text: `Discord bridge status: ${statusText}`,
          } as any,
        ]
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
