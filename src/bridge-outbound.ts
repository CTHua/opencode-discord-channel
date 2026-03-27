import { buildAgentButtons, buildAgentEmbed } from "./agent-display"
import type { DiscordClientWrapper } from "./discord-client"
import type { ConnectionStateManager } from "./state"
import type { AgentInfo } from "./types"

type AgentDisplayFunctions = {
  buildAgentEmbed: typeof buildAgentEmbed
  buildAgentButtons: typeof buildAgentButtons
}

type OutboundBridgeDeps = {
  discordClient: Pick<DiscordClientWrapper, "sendMessage" | "startTyping" | "sendButtons">
  state: Pick<
    ConnectionStateManager,
    "isConnected" | "getSessionId" | "getChannelId" | "getCurrentAgent"
  >
  agentDisplay?: AgentDisplayFunctions
  fetchAgents: () => Promise<AgentInfo[]>
}

type OpenCodeEvent =
  | {
      type: "message.part.updated"
      properties?: {
        part?: {
          sessionID?: string
          messageID?: string
          type?: string
          text?: string
        }
      }
    }
  | {
      type: "session.idle"
      properties?: { sessionID?: string }
    }
  | {
      type: "session.status"
      properties?: { sessionID?: string; status?: { type?: string } }
    }

export function createOutboundBridge(
  deps: OutboundBridgeDeps,
): (event: OpenCodeEvent) => Promise<void> {
  const { discordClient, state, fetchAgents } = deps
  const display = deps.agentDisplay ?? { buildAgentEmbed, buildAgentButtons }
  const textBuffer = new Map<string, string>()

  return async function handleEvent(event: OpenCodeEvent): Promise<void> {
    if (!state.isConnected()) return

    const connectedSessionId = state.getSessionId()
    if (!connectedSessionId) return

    if (event.type === "message.part.updated") {
      const part = event.properties?.part
      if (!part) return
      if (part.sessionID !== connectedSessionId) return
      if (part.type !== "text") return
      if (!part.messageID || typeof part.text !== "string") return

      textBuffer.set(part.messageID, part.text)
      return
    }

    const sessionID = event.properties?.sessionID
    if (sessionID !== connectedSessionId) return

    if (event.type === "session.idle") {
      const channelId = state.getChannelId()
      if (!channelId) return

      const allText = [...textBuffer.values()].join("\n\n")
      if (allText.trim().length === 0) return

      textBuffer.clear()

      await discordClient.sendMessage(channelId, allText)

      try {
        const agents = await fetchAgents()
        const currentAgent = state.getCurrentAgent() ?? (agents[0]?.name ?? "")
        const embed = display.buildAgentEmbed(currentAgent)
        const rows = display.buildAgentButtons(agents, currentAgent)
        if (rows.length > 0) {
          await discordClient.sendButtons(channelId, embed, rows)
        }
      } catch {
      }

      return
    }

    if (event.type === "session.status" && event.properties?.status?.type === "busy") {
      const channelId = state.getChannelId()
      if (!channelId) return
      await discordClient.startTyping(channelId)
    }
  }
}
