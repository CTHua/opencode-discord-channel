import type { BridgeConfig, ConnectionState } from "./types"

export function createConnectionState() {
  let state: ConnectionState = {
    connected: false,
    sessionId: null,
    channelId: null,
    ownerId: null,
    botUserId: null,
    currentAgent: null,
  }

  return {
    connect(config: BridgeConfig): void {
      state = {
        connected: true,
        sessionId: config.sessionId,
        channelId: config.channelId,
        ownerId: config.ownerId,
        botUserId: null,
        currentAgent: null,
      }
    },

    disconnect(): void {
      state = {
        connected: false,
        sessionId: null,
        channelId: null,
        ownerId: null,
        botUserId: null,
        currentAgent: null,
      }
    },

    setBotUserId(id: string): void {
      state = { ...state, botUserId: id }
    },

    setCurrentAgent(name: string): void {
      state = { ...state, currentAgent: name }
    },

    getState(): Readonly<ConnectionState> {
      return { ...state }
    },

    isConnected(): boolean {
      return state.connected
    },

    getSessionId(): string | null {
      return state.sessionId
    },

    getChannelId(): string | null {
      return state.channelId
    },

    getOwnerId(): string | null {
      return state.ownerId
    },

    getBotUserId(): string | null {
      return state.botUserId
    },

    getCurrentAgent(): string | null {
      return state.currentAgent
    },
  }
}

export type ConnectionStateManager = ReturnType<typeof createConnectionState>
