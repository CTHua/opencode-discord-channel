import type { Plugin } from "@opencode-ai/plugin"
import { createDiscordClient } from "./discord-client"
import { createConnectionState } from "./state"
import { createInboundBridge } from "./bridge-inbound"
import { createOutboundBridge } from "./bridge-outbound"
import { createSystemPromptHook } from "./system-prompt"
import { buildAgentEmbed, buildAgentSelectMenu } from "./agent-display"
import { resolveConfig, updateConfig, getConfigPath } from "./config"
import type { DiscordClientWrapper } from "./discord-client"
import type { ConnectionStateManager } from "./state"
import type { AgentInfo, QuestionAnswer, QuestionRequest } from "./types"
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
    try {
      fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`)
    } catch {}
  }

  let outbound: ReturnType<typeof createOutboundBridge> | null = null
  const questionRequests = new Map<string, QuestionRequest>()

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
      if (outbound) {
        const text = (params.parts[0] as any)?.text
        if (text) outbound.trackInjectedText(text)
      }
      log(
        `[promptSession] result: ${JSON.stringify(result).slice(0, 500)}`,
      )
    } catch (err) {
      log(`[promptSession] promptAsync threw: ${err}`)
      try {
        const result = await (ctx.client as any).session.prompt({
          path: { id: params.sessionID },
          body: { parts: params.parts },
        })
        log(
          `[promptSession] prompt fallback: ${JSON.stringify(result).slice(0, 500)}`,
        )
      } catch (err2) {
        log(`[promptSession] prompt also threw: ${err2}`)
        throw err2
      }
    }
  }

  async function replyQuestion(
    requestID: string,
    answers: QuestionAnswer[],
  ): Promise<void> {
    log(`[question] reply requestID=${requestID}`)
    const internalClient = (ctx.client as any)._client
    if (internalClient?.post) {
      const result = await internalClient.post({
        url: `/question/${encodeURIComponent(requestID)}/reply`,
        body: { answers },
        headers: { "Content-Type": "application/json" },
      })
      log(
        `[question] reply via internal client: ${JSON.stringify(result?.data ?? result?.error).slice(0, 200)}`,
      )
      if (result?.error) {
        throw new Error(
          `Question reply failed: ${JSON.stringify(result.error)}`,
        )
      }
    } else {
      const baseUrl = ctx.serverUrl.toString().replace(/\/$/, "")
      const url = `${baseUrl}/question/${encodeURIComponent(requestID)}/reply`
      log(`[question] reply POST ${url}`)
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      if (!resp.ok) {
        const body = await resp.text().catch(() => "")
        throw new Error(`Question reply failed: ${resp.status} ${body}`)
      }
    }
    questionRequests.delete(requestID)
    log(`[question] reply success`)
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

  outbound = createOutboundBridge({
    discordClient,
    state,
    agentDisplay: { buildAgentEmbed, buildAgentSelectMenu },
    fetchAgents,
  })
  activeEventHandler = outbound.handleEvent

  const systemPromptHook = createSystemPromptHook(state)

  return {
    async config(config) {
      config.command = config.command ?? {}
      config.command["dc:connect"] = {
        template:
          "[opencode-discord-channel plugin: bridge connected to $ARGUMENTS]",
        description:
          "(plugin: discord-channel) Connect Discord bridge to a channel",
      }
      config.command["dc:disconnect"] = {
        template: "[opencode-discord-channel plugin: bridge disconnected]",
        description:
          "(plugin: discord-channel) Disconnect Discord bridge",
      }
      config.command["dc:status"] = {
        template: "[opencode-discord-channel plugin: status check]",
        description:
          "(plugin: discord-channel) Show Discord bridge connection status",
      }
      config.command["dc:agents"] = {
        template: "[opencode-discord-channel plugin: show agent selector]",
        description:
          "(plugin: discord-channel) Show agent selector in Discord",
      }
    },

    async "command.execute.before"(input, output) {
      const { command, sessionID, arguments: args } = input

      if (command === "dc:connect") {
        const resolved = resolveConfig()
        const token = resolved.botToken
        if (!token) {
          output.parts = [
            textPart(
              `Error: No bot token found. Set DISCORD_BOT_TOKEN env var or create config at ${getConfigPath()}`,
            ),
          ]
          return
        }

        const channelId = args.trim() || resolved.defaultChannelId
        if (!channelId) {
          output.parts = [
            textPart(
              "Error: Please provide a Discord channel ID. Usage: /dc:connect <channel_id>",
            ),
          ]
          return
        }

        const ownerId = resolved.ownerId
        if (!ownerId) {
          output.parts = [
            textPart(
              `Error: No owner ID found. Set DISCORD_OWNER_ID env var or add to config at ${getConfigPath()}`,
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

          const channelValid =
            await discordClient.validateChannel(channelId)
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

          updateConfig({ defaultChannelId: channelId })

          try {
            await discordClient.registerSlashCommands(token, channelId)
            log("[slash] commands registered")
          } catch (err) {
            log(`[slash] registration failed: ${err}`)
          }

          discordClient.onSlashCommand(async (command, interaction) => {
            if (command === "agents") {
              if (!state.isConnected()) {
                await interaction.reply({ content: "Not connected.", ephemeral: true })
                return
              }
              const ch = interaction.channelId as string
              await interaction.deferReply({ ephemeral: true })
              try {
                const agents = await fetchAgents()
                if (agents.length <= 1) {
                  await interaction.editReply({ content: "No agents available." })
                  return
                }
                const currentAgent =
                  state.getCurrentAgent() ?? agents[0]?.name ?? ""
                const embed = buildAgentEmbed(currentAgent)
                const rows = buildAgentSelectMenu(agents, currentAgent)
                if (rows.length > 0) {
                  const msgId = await discordClient.sendSelectMenu(ch, embed, rows)
                  state.setAgentMenuMessageId(msgId)
                }
                await interaction.editReply({ content: "Agent selector sent." })
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Unknown error"
                await interaction.editReply({ content: `Failed: ${msg}` }).catch(() => {})
              }
              return
            }

            if (command === "status") {
              const s = state.getState()
              const statusText = s.connected
                ? `Connected to channel <#${s.channelId}> (agent: **${s.currentAgent ?? "default"}**)`
                : "Not connected."
              await interaction.reply({ content: statusText, ephemeral: true })
              return
            }

            await interaction.reply({ content: "Unknown command.", ephemeral: true })
          })

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
                parts: [
                  textPart(
                    `(Agent switched to ${agentName} via Discord)`,
                  ),
                ],
              }).catch(() => {})
            },
            onQuestionReply: replyQuestion,
            getQuestionInfo: (requestID, questionIndex) => {
              const req = questionRequests.get(requestID)
              return req?.questions[questionIndex] ?? null
            },
            onShowAgents: async () => {
              const ch = state.getChannelId()
              if (!ch) return
              const agents = await fetchAgents()
              if (agents.length <= 1) return
              const currentAgent =
                state.getCurrentAgent() ?? agents[0]?.name ?? ""
              const embed = buildAgentEmbed(currentAgent)
              const rows = buildAgentSelectMenu(agents, currentAgent)
              if (rows.length > 0) {
                const msgId = await discordClient.sendSelectMenu(ch, embed, rows)
                state.setAgentMenuMessageId(msgId)
              }
            },
          })

          output.parts = [
            textPart(
              `Discord bridge connected to channel ${channelId}. Messages from this channel will appear here.`,
            ),
          ]
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Unknown error"
          output.parts = [
            textPart(`Failed to connect Discord bot: ${msg}`),
          ]
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
        const resolved = resolveConfig()
        const configStatus = resolved.botToken
          ? "configured"
          : "not configured"
        const statusText = s.connected
          ? `Connected to channel ${s.channelId} (session: ${s.sessionId}, agent: ${s.currentAgent ?? "default"})`
          : `Not connected. Config: ${configStatus} (${getConfigPath()})`
        output.parts = [
          textPart(`Discord bridge status: ${statusText}`),
        ]
        return
      }

      if (command === "dc:agents") {
        if (!state.isConnected()) {
          output.parts = [
            textPart("Discord bridge not connected. Use /dc:connect first."),
          ]
          return
        }
        const channelId = state.getChannelId()
        if (!channelId) return
        try {
          const agents = await fetchAgents()
          if (agents.length > 1) {
            const currentAgent =
              state.getCurrentAgent() ?? agents[0]?.name ?? ""
            const embed = buildAgentEmbed(currentAgent)
            const rows = buildAgentSelectMenu(agents, currentAgent)
            if (rows.length > 0) {
              const msgId = await discordClient.sendSelectMenu(channelId, embed, rows)
              state.setAgentMenuMessageId(msgId)
            }
          }
          output.parts = [textPart("Agent selector sent to Discord.")]
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error"
          output.parts = [textPart(`Failed to show agents: ${msg}`)]
        }
        return
      }
    },

    async event({ event }) {
      const evt = event as { type: string; properties?: any }
      if (
        evt.type === "question.asked" &&
        evt.properties?.id &&
        evt.properties?.questions
      ) {
        questionRequests.set(evt.properties.id, evt.properties)
      }
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
