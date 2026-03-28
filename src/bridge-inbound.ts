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

  discordClient.onMessage(async (msg) => {
    if (!state.isConnected()) return
    if (msg.channelId !== state.getChannelId()) return
    if (msg.authorId === state.getBotUserId()) return
    if (msg.authorId !== state.getOwnerId()) return

    const sessionId = state.getSessionId()
    if (!sessionId) return

    const formattedText = `<discord channel="${escapeXml(msg.channelId)}" user="${escapeXml(msg.username)}">\n${msg.content}\n</discord>`

    const currentAgent = state.getCurrentAgent()
    const params: Parameters<SessionPromptFn>[0] = {
      sessionID: sessionId,
      parts: [{ type: "text", text: formattedText }],
    }

    if (currentAgent) {
      params.agent = currentAgent
    }

    await sessionPrompt(params)
  })

  discordClient.onButtonInteraction(async (customId, userId) => {
    if (!state.isConnected()) return
    if (userId !== state.getOwnerId()) return

    const agentName = parseButtonInteraction(customId)
    if (!agentName) return

    onAgentSwitch(agentName)
  })
}
