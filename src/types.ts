import type { PluginInput } from "@opencode-ai/plugin"

export type { PluginInput }

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
