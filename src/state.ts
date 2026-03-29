import type {
  BridgeConfig,
  ConnectionState,
  PendingQuestion,
  QuestionAnswer,
} from "./types"

export function createConnectionState() {
  let state: ConnectionState = {
    connected: false,
    sessionId: null,
    channelId: null,
    ownerId: null,
    botUserId: null,
    currentAgent: null,
  }

  const pendingQuestions = new Map<string, PendingQuestion>()

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

    addPendingQuestion(
      requestID: string,
      sessionID: string,
      totalQuestions: number,
    ): void {
      pendingQuestions.set(requestID, {
        requestID,
        sessionID,
        totalQuestions,
        answers: Array.from({ length: totalQuestions }, () => null),
      })
    },

    setQuestionAnswer(
      requestID: string,
      questionIndex: number,
      answer: QuestionAnswer,
    ): PendingQuestion | null {
      const pending = pendingQuestions.get(requestID)
      if (!pending) return null
      if (questionIndex < 0 || questionIndex >= pending.totalQuestions)
        return null
      pending.answers[questionIndex] = answer
      return pending
    },

    getPendingQuestion(requestID: string): PendingQuestion | null {
      return pendingQuestions.get(requestID) ?? null
    },

    removePendingQuestion(requestID: string): void {
      pendingQuestions.delete(requestID)
    },

    isQuestionComplete(requestID: string): boolean {
      const pending = pendingQuestions.get(requestID)
      if (!pending) return false
      return pending.answers.every((a) => a !== null)
    },
  }
}

export type ConnectionStateManager = ReturnType<typeof createConnectionState>
