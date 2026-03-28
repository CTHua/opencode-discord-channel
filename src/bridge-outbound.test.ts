import { beforeEach, describe, expect, it, mock } from "bun:test"
import { createOutboundBridge } from "./bridge-outbound"

function createMockState(
  overrides: Partial<{
    isConnected: boolean
    sessionId: string | null
    channelId: string | null
    currentAgent: string | null
  }> = {},
) {
  const defaults = {
    isConnected: true,
    sessionId: "ses_main",
    channelId: "ch_discord",
    currentAgent: null,
    ...overrides,
  }

  return {
    isConnected: () => defaults.isConnected,
    getSessionId: () => defaults.sessionId,
    getChannelId: () => defaults.channelId,
    getCurrentAgent: () => defaults.currentAgent,
    getState: () => ({ ...defaults }),
  }
}

function createMockDiscordClient() {
  return {
    sendMessage: mock(async (_channelId: string, _content: string) => {}),
    startTyping: mock(async (_channelId: string) => {}),
    sendButtons: mock(async (_channelId: string, _embed: any, _rows: any[]) => {}),
  }
}

function createMockAgentDisplay() {
  return {
    buildAgentEmbed: mock((_name: string, _color?: string, _status?: string) => ({ toJSON: () => ({}) })),
    buildAgentButtons: mock((_agents: any[], _current: string) => []),
  }
}

describe("createOutboundBridge", () => {
  let state: ReturnType<typeof createMockState>
  let discord: ReturnType<typeof createMockDiscordClient>
  let agentDisplay: ReturnType<typeof createMockAgentDisplay>
  let fetchAgents: ReturnType<typeof mock>
  let handler: (event: any) => Promise<void>

  beforeEach(() => {
    state = createMockState()
    discord = createMockDiscordClient()
    agentDisplay = createMockAgentDisplay()
    fetchAgents = mock(async () => [{ name: "sisyphus", mode: "primary" as const }])

    handler = createOutboundBridge({
      discordClient: discord as any,
      state: state as any,
      agentDisplay: agentDisplay as any,
      fetchAgents,
    })
  })

  it("buffers text on message.part.updated and does not send immediately", async () => {
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hello" },
      },
    })

    expect(discord.sendMessage).not.toHaveBeenCalled()
    expect(discord.sendButtons).not.toHaveBeenCalled()
  })

  it("replaces text for same messageID on repeated part updates", async () => {
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hel" },
      },
    })
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hello world" },
      },
    })

    await handler({
      type: "session.idle",
      properties: { sessionID: "ses_main" },
    })

    expect(discord.sendMessage).toHaveBeenCalledTimes(1)
    expect(discord.sendMessage.mock.calls[0]?.[1]).toBe("hello world")
  })

  it("sends buffered text on session.idle", async () => {
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hello world" },
      },
    })

    await handler({
      type: "session.idle",
      properties: { sessionID: "ses_main" },
    })

    expect(discord.sendMessage).toHaveBeenCalledTimes(1)
    expect(discord.sendMessage.mock.calls[0]).toContain("hello world")
  })

  it("does not send when buffer is empty", async () => {
    await handler({
      type: "session.idle",
      properties: { sessionID: "ses_main" },
    })

    expect(discord.sendMessage).not.toHaveBeenCalled()
    expect(discord.sendButtons).not.toHaveBeenCalled()
  })

  it("clears buffer after sending once", async () => {
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "first" },
      },
    })

    await handler({ type: "session.idle", properties: { sessionID: "ses_main" } })
    await handler({ type: "session.idle", properties: { sessionID: "ses_main" } })

    expect(discord.sendMessage).toHaveBeenCalledTimes(1)
  })

  it("ignores tool parts", async () => {
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "tool", tool: "bash" },
      },
    })

    await handler({ type: "session.idle", properties: { sessionID: "ses_main" } })

    expect(discord.sendMessage).not.toHaveBeenCalled()
  })

  describe("given reasoning part", () => {
    it("ignores reasoning parts", async () => {
      await handler({
        type: "message.part.updated",
        properties: {
          part: {
            id: "part1",
            sessionID: "ses_main",
            messageID: "msg1",
            type: "reasoning",
            text: "thinking...",
          },
        },
      })
      await handler({ type: "session.idle", properties: { sessionID: "ses_main" } })
      expect(discord.sendMessage).not.toHaveBeenCalled()
    })
  })

  it("ignores non-text parts like reasoning", async () => {
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "reasoning", text: "think" },
      },
    })

    await handler({ type: "session.idle", properties: { sessionID: "ses_main" } })

    expect(discord.sendMessage).not.toHaveBeenCalled()
  })

  it("ignores events from different session", async () => {
    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_OTHER", messageID: "msg1", type: "text", text: "ignore me" },
      },
    })
    await handler({ type: "session.idle", properties: { sessionID: "ses_OTHER" } })
    await handler({
      type: "session.status",
      properties: { sessionID: "ses_OTHER", status: { type: "busy" } },
    })

    expect(discord.sendMessage).not.toHaveBeenCalled()
    expect(discord.startTyping).not.toHaveBeenCalled()
  })

  it("sends typing indicator on session.status busy", async () => {
    await handler({
      type: "session.status",
      properties: { sessionID: "ses_main", status: { type: "busy" } },
    })

    expect(discord.startTyping).toHaveBeenCalledWith("ch_discord")
  })

  it("does not send typing indicator for idle status", async () => {
    await handler({
      type: "session.status",
      properties: { sessionID: "ses_main", status: { type: "idle" } },
    })

    expect(discord.startTyping).not.toHaveBeenCalled()
  })

  it("sends agent embed+buttons after text flush on idle", async () => {
    agentDisplay.buildAgentButtons.mockReturnValueOnce([{} as any])

    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hello" },
      },
    })

    await handler({
      type: "session.idle",
      properties: { sessionID: "ses_main" },
    })

    expect(fetchAgents).toHaveBeenCalledTimes(1)
    expect(agentDisplay.buildAgentEmbed).toHaveBeenCalledTimes(1)
    expect(agentDisplay.buildAgentButtons).toHaveBeenCalledTimes(1)
    expect(discord.sendButtons).toHaveBeenCalledTimes(1)
  })

  it("does not send buttons when no button rows", async () => {
    agentDisplay.buildAgentButtons.mockReturnValueOnce([])

    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hello" },
      },
    })
    await handler({ type: "session.idle", properties: { sessionID: "ses_main" } })

    expect(discord.sendButtons).not.toHaveBeenCalled()
  })

  it("ignores all events when disconnected", async () => {
    state = createMockState({ isConnected: false })
    handler = createOutboundBridge({
      discordClient: discord as any,
      state: state as any,
      agentDisplay: agentDisplay as any,
      fetchAgents,
    })

    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hi" },
      },
    })
    await handler({ type: "session.idle", properties: { sessionID: "ses_main" } })
    await handler({
      type: "session.status",
      properties: { sessionID: "ses_main", status: { type: "busy" } },
    })

    expect(discord.sendMessage).not.toHaveBeenCalled()
    expect(discord.sendButtons).not.toHaveBeenCalled()
    expect(discord.startTyping).not.toHaveBeenCalled()
  })

  it("does not throw if fetchAgents fails after sending text", async () => {
    fetchAgents = mock(async () => {
      throw new Error("agent list failed")
    })
    handler = createOutboundBridge({
      discordClient: discord as any,
      state: state as any,
      agentDisplay: agentDisplay as any,
      fetchAgents,
    })

    await handler({
      type: "message.part.updated",
      properties: {
        part: { id: "part1", sessionID: "ses_main", messageID: "msg1", type: "text", text: "hi" },
      },
    })

    await expect(handler({ type: "session.idle", properties: { sessionID: "ses_main" } })).resolves.toBeUndefined()
    expect(discord.sendMessage).toHaveBeenCalledTimes(1)
    expect(discord.sendButtons).not.toHaveBeenCalled()
  })
})
