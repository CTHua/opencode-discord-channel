import { describe, it, expect, mock, beforeEach } from "bun:test"

const mockLogin = mock(async (_token: string) => "mock-token")
const mockClientDestroyFn = mock(async () => {})
const mockSendMessage = mock(async (_content: any) => ({ id: "msg1" }))
const mockSendTyping = mock(async () => {})
const mockChannelFetch = mock(async () => ({
  id: "channel123",
  name: "test-channel",
  isTextBased: () => true,
  send: mockSendMessage,
  sendTyping: mockSendTyping,
}))
const mockClientOn = mock((_event: string, _cb: any) => mockClientInstance)
const mockClientOnce = mock((_event: string, _cb: any) => mockClientInstance)
const mockClientOff = mock((_event: string, _cb: any) => mockClientInstance)
const mockDeferUpdate = mock(async () => {})

let interactionCreateCallback: ((interaction: any) => void | Promise<void>) | null =
  null

const mockBotUser = { id: "bot123", username: "TestBot" }

const mockChannel = {
  id: "channel123",
  send: mockSendMessage,
  sendTyping: mockSendTyping,
  isTextBased: () => true,
}

const mockCacheGet = mock((_id: string) => mockChannel)

const mockClientInstance: any = {
  login: mockLogin,
  destroy: mockClientDestroyFn,
  on: mockClientOn,
  once: mockClientOnce,
  off: mockClientOff,
  user: mockBotUser,
  channels: {
    cache: { get: mockCacheGet },
    fetch: mockChannelFetch,
  },
}

// mock.module MUST be called before the dynamic import — ordering is critical for bun's module mock
mock.module("discord.js", () => ({
  Client: class MockClient {
    login = mockLogin
    destroy = mockClientDestroyFn
    on = mockClientOn
    once = mockClientOnce
    off = mockClientOff
    user = mockBotUser
    channels = {
      cache: { get: mockCacheGet },
      fetch: mockChannelFetch,
    }
  },
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
  },
}))

const { createDiscordClient } = await import("./discord-client")

function simulateReady() {
  mockClientOnce.mockImplementation((_event: string, cb: any) => {
    if (_event === "clientReady" || _event === "ready") setTimeout(cb, 0)
    return mockClientInstance
  })
}

describe("createDiscordClient", () => {
  let client: ReturnType<typeof createDiscordClient>

  beforeEach(() => {
    client = createDiscordClient()
    mockLogin.mockClear()
    mockClientDestroyFn.mockClear()
    mockSendMessage.mockClear()
    mockSendTyping.mockClear()
    mockChannelFetch.mockClear()
    mockClientOn.mockClear()
    mockClientOnce.mockClear()
    mockCacheGet.mockClear()
    mockLogin.mockImplementation(async (_token: string) => "mock-token")
    mockClientOnce.mockImplementation((_event: string, _cb: any) => mockClientInstance)
    mockDeferUpdate.mockClear()
    interactionCreateCallback = null
    mockClientOn.mockImplementation((_event: string, _cb: any) => {
      if (_event === "interactionCreate") {
        interactionCreateCallback = _cb
      }
      return mockClientInstance
    })
  })

  describe("connect()", () => {
    it("calls login with the provided token", async () => {
      simulateReady()
      await client.connect("test-token")
      expect(mockLogin).toHaveBeenCalledWith("test-token")
    })

    it("does not leak the token in error messages", async () => {
      mockLogin.mockRejectedValueOnce(new Error("invalid auth"))
      try {
        await client.connect("super-secret-token-value-1234567890")
        throw new Error("should have thrown")
      } catch (err: any) {
        expect(err.message).not.toContain("super-secret-token-value-1234567890")
      }
    })

    it("sets botUserId after successful connection", async () => {
      simulateReady()
      await client.connect("test-token")
      expect(client.getBotUserId()).toBe("bot123")
    })
  })

  describe("disconnect()", () => {
    it("calls client.destroy()", async () => {
      simulateReady()
      await client.connect("test-token")
      await client.disconnect()
      expect(mockClientDestroyFn).toHaveBeenCalled()
    })

    it("resets botUserId to null", async () => {
      simulateReady()
      await client.connect("test-token")
      expect(client.getBotUserId()).toBe("bot123")
      await client.disconnect()
      expect(client.getBotUserId()).toBeNull()
    })
  })

  describe("sendMessage()", () => {
    it("sends a message to the specified channel", async () => {
      simulateReady()
      await client.connect("test-token")
      await client.sendMessage("channel123", "hello world")
      expect(mockSendMessage).toHaveBeenCalledWith("hello world")
    })

    it("splits messages over 2000 chars into multiple sends", async () => {
      simulateReady()
      await client.connect("test-token")
      const longMessage = "x".repeat(2500)
      await client.sendMessage("channel123", longMessage)
      expect(mockSendMessage.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it("does not call send for empty string", async () => {
      simulateReady()
      await client.connect("test-token")
      await client.sendMessage("channel123", "")
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it("throws when called before connect", async () => {
      await expect(client.sendMessage("ch", "hello")).rejects.toThrow()
    })
  })

  describe("sendEmbed()", () => {
    it("sends an embed to the channel", async () => {
      simulateReady()
      await client.connect("test-token")
      const fakeEmbed = { title: "Test" } as any
      await client.sendEmbed("channel123", fakeEmbed)
      expect(mockSendMessage).toHaveBeenCalledWith({ embeds: [fakeEmbed] })
    })
  })

  describe("startTyping()", () => {
    it("calls channel.sendTyping()", async () => {
      simulateReady()
      await client.connect("test-token")
      await client.startTyping("channel123")
      expect(mockSendTyping).toHaveBeenCalled()
    })
  })

  describe("validateChannel()", () => {
    it("returns true for accessible text channel", async () => {
      simulateReady()
      await client.connect("test-token")
      await expect(client.validateChannel("channel123")).resolves.toBe(true)
    })

    it("returns false when channel is not accessible", async () => {
      simulateReady()
      await client.connect("test-token")
      mockCacheGet.mockImplementationOnce((_id: string) => null)
      mockChannelFetch.mockRejectedValueOnce(new Error("missing channel"))

      await expect(client.validateChannel("missing")).resolves.toBe(false)
    })
  })

  describe("getBotUserId()", () => {
    it("returns null before connection", () => {
      expect(client.getBotUserId()).toBeNull()
    })
  })

  describe("onMessage()", () => {
    it("registers a handler via on('messageCreate')", async () => {
      simulateReady()
      const handler = mock(() => {})
      client.onMessage(handler)
      await client.connect("test-token")
      const messageCreateCalls = mockClientOn.mock.calls.filter(
        (call: any[]) => call[0] === "messageCreate",
      )
      expect(messageCreateCalls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("onButtonInteraction()", () => {
    it("acknowledges button interaction via deferUpdate", async () => {
      simulateReady()
      const handler = mock(() => {})
      client.onButtonInteraction(handler)
      await client.connect("test-token")

      await interactionCreateCallback?.({
        isButton: () => true,
        deferUpdate: mockDeferUpdate,
        customId: "agent_switch_oracle",
        user: { id: "u1", username: "owner" },
      })

      expect(mockDeferUpdate).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith("agent_switch_oracle", "u1", "owner")
    })
  })

  describe("factory pattern", () => {
    it("returns independent instances", () => {
      const c1 = createDiscordClient()
      const c2 = createDiscordClient()
      c1.onMessage(() => {})
      expect(c1.getBotUserId()).toBeNull()
      expect(c2.getBotUserId()).toBeNull()
    })
  })
})
