import type { PluginInput } from "@opencode-ai/plugin"
import type { Part } from "@opencode-ai/sdk"

export type { PluginInput }

// The SDK's Hooks use Part[] (output format with required id/sessionID/messageID)
// but plugins construct TextPartInput (input format with optional fields).
// This helper centralizes the unavoidable cast at the SDK type boundary.
export function textPart(text: string): Part {
  return { type: "text", text } as unknown as Part
}

export interface ConnectionState {
  connected: boolean
  sessionId: string | null
  channelId: string | null
  ownerId: string | null
  botUserId: string | null
  currentAgent: string | null
}

export interface BridgeConfig {
  botToken: string
  ownerId: string
  channelId: string
  sessionId: string
}

export interface DiscordMessage {
  content: string
  authorId: string
  username: string
  channelId: string
  messageId: string
}

export interface AgentInfo {
  name: string
  mode: "primary" | "subagent" | "all"
  color?: string
  description?: string
}
