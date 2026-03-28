import { parseButtonInteraction } from "./agent-display"
import type { DiscordClientWrapper } from "./discord-client"
import type { ConnectionStateManager } from "./state"

type SessionPromptFn = (params: {
  sessionID: string
  parts: Array<{ type: string; text: string }>
  agent?: string
}) => Promise<void>

type InboundBridgeDeps = {
  discordClient: Pick<DiscordClientWrapper, "onMessage" | "onButtonInteraction">
  state: Pick<
    ConnectionStateManager,
    | "isConnected"
    | "getSessionId"
    | "getChannelId"
    | "getOwnerId"
    | "getBotUserId"
    | "getCurrentAgent"
  >
  sessionPrompt: SessionPromptFn
  onAgentSwitch: (agentName: string) => void
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function createInboundBridge(deps: InboundBridgeDeps): void {
  const { discordClient, state, sessionPrompt, onAgentSwitch } = deps
  const fs = require("fs")
  const logFile = "/tmp/opencode-discord-channel.log"

  function log(msg: string) {
    try {
      fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`)
    } catch {}
  }

  log("[init] inbound bridge created")

  discordClient.onMessage(async (msg) => {
    log(`[msg] from=${msg.authorId} (${msg.username}) channel=${msg.channelId} content="${msg.content.slice(0, 50)}"`)
    log(`[state] connected=${state.isConnected()} channelId=${state.getChannelId()} ownerId=${state.getOwnerId()} botUserId=${state.getBotUserId()}`)

    if (!state.isConnected()) { log("[filter] not connected"); return }
    if (msg.channelId !== state.getChannelId()) { log(`[filter] wrong channel: ${msg.channelId} !== ${state.getChannelId()}`); return }
    if (msg.authorId === state.getBotUserId()) { log("[filter] bot self-message"); return }
    if (msg.authorId !== state.getOwnerId()) { log(`[filter] not owner: ${msg.authorId} !== ${state.getOwnerId()}`); return }

    const sessionId = state.getSessionId()
    if (!sessionId) { log("[filter] no sessionId"); return }

    const formattedText = msg.content

    const currentAgent = state.getCurrentAgent()
    const params: Parameters<SessionPromptFn>[0] = {
      sessionID: sessionId,
      parts: [{ type: "text", text: formattedText }],
    }

    if (currentAgent) {
      params.agent = currentAgent
    }

    log(`[prompt] sessionID=${sessionId} agent=${currentAgent ?? "default"} text="${formattedText.slice(0, 80)}"`)

    try {
      await sessionPrompt(params)
      log("[prompt] success")
    } catch (err) {
      log(`[prompt] FAILED: ${err}`)
    }
  })

  discordClient.onButtonInteraction(async (customId, userId) => {
    if (!state.isConnected()) return
    if (userId !== state.getOwnerId()) return

    const agentName = parseButtonInteraction(customId)
    if (!agentName) return

    onAgentSwitch(agentName)
  })
}
