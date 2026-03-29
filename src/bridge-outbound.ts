import { buildAgentSelectMenu, buildAgentEmbed } from "./agent-display"
import {
  buildQuestionEmbed,
  buildQuestionComponents,
} from "./question-display"
import type { DiscordClientWrapper } from "./discord-client"
import type { ConnectionStateManager } from "./state"
import type { AgentInfo, QuestionRequest } from "./types"

type AgentDisplayFunctions = {
  buildAgentEmbed: typeof buildAgentEmbed
  buildAgentSelectMenu: typeof buildAgentSelectMenu
}

type OutboundBridgeDeps = {
  discordClient: Pick<
    DiscordClientWrapper,
    "sendMessage" | "startTyping" | "sendSelectMenu" | "sendQuestion"
  >
  state: Pick<
    ConnectionStateManager,
    | "isConnected"
    | "getSessionId"
    | "getChannelId"
    | "getCurrentAgent"
    | "addPendingQuestion"
  >
  agentDisplay?: AgentDisplayFunctions
  fetchAgents: () => Promise<AgentInfo[]>
}

type OpenCodeEvent =
  | {
      type: "message.part.updated"
      properties?: {
        part?: {
          id?: string
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
  | {
      type: "question.asked"
      properties?: QuestionRequest
    }

export function createOutboundBridge(deps: OutboundBridgeDeps): {
  handleEvent: (event: OpenCodeEvent) => Promise<void>
  trackInjectedText: (text: string) => void
} {
  const { discordClient, state, fetchAgents } = deps
  const display = deps.agentDisplay ?? {
    buildAgentEmbed,
    buildAgentSelectMenu,
  }
  const textBuffer = new Map<string, string>()
  const injectedTexts = new Set<string>()
  let cachedAgents: AgentInfo[] | null = null
  let cachedAt = 0
  const CACHE_TTL = 30_000

  async function getCachedAgents(): Promise<AgentInfo[]> {
    const now = Date.now()
    if (cachedAgents && now - cachedAt < CACHE_TTL) return cachedAgents
    cachedAgents = await fetchAgents()
    cachedAt = now
    return cachedAgents
  }

  function trackInjectedText(text: string) {
    injectedTexts.add(text)
  }

  async function handleEvent(event: OpenCodeEvent): Promise<void> {
    if (!state.isConnected()) return

    const connectedSessionId = state.getSessionId()
    if (!connectedSessionId) return

    if (event.type === "message.part.updated") {
      const part = event.properties?.part
      if (!part) return
      if (part.sessionID !== connectedSessionId) return
      if (part.type !== "text") return
      if (part.text && injectedTexts.has(part.text)) {
        injectedTexts.delete(part.text)
        return
      }
      const partKey = part.id ?? part.messageID
      if (!partKey || typeof part.text !== "string") return

      textBuffer.set(partKey, part.text)
      return
    }

    const sessionID = event.properties?.sessionID
    if (sessionID !== connectedSessionId) return

    if (event.type === "session.idle") {
      const channelId = state.getChannelId()
      if (!channelId) return

      const allText = [...textBuffer.values()].join("\n\n")
      if (allText.trim().length === 0) return
      await discordClient.sendMessage(channelId, allText)
      textBuffer.clear()

      try {
        const agents = await getCachedAgents()
        if (agents.length > 1) {
          const currentAgent =
            state.getCurrentAgent() ?? agents[0]?.name ?? ""
          const embed = display.buildAgentEmbed(currentAgent)
          const rows = display.buildAgentSelectMenu(agents, currentAgent)
          if (rows.length > 0) {
            await discordClient.sendSelectMenu(channelId, embed, rows)
          }
        }
      } catch (err) {
        console.error("[discord-channel] agent display failed:", err)
      }

      return
    }

    if (event.type === "question.asked") {
      const req = event.properties
      if (!req || !req.id || !req.questions?.length) return
      if (req.sessionID !== connectedSessionId) return

      const channelId = state.getChannelId()
      if (!channelId) return

      state.addPendingQuestion(req.id, req.sessionID, req.questions.length)

      for (let i = 0; i < req.questions.length; i++) {
        const q = req.questions[i]
        const embed = buildQuestionEmbed(q, i, req.questions.length)
        const components = buildQuestionComponents(q, req.id, i)
        try {
          await discordClient.sendQuestion(channelId, [embed], components)
        } catch (err) {
          console.error("[discord-channel] question display failed:", err)
        }
      }
      return
    }

    if (
      event.type === "session.status" &&
      event.properties?.status?.type === "busy"
    ) {
      const channelId = state.getChannelId()
      if (!channelId) return
      await discordClient.startTyping(channelId)
    }
  }

  return { handleEvent, trackInjectedText }
}
