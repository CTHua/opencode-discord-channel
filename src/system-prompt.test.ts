import { describe, it, expect } from "bun:test"
import { createSystemPromptHook } from "./system-prompt"

function createMockState(
  connected: boolean,
  channelId: string | null = "ch_123",
  sessionId: string | null = "ses_main",
) {
  return {
    isConnected: () => connected,
    getChannelId: () => channelId,
    getSessionId: () => sessionId,
  }
}

describe("createSystemPromptHook", () => {
  describe("given connected state", () => {
    it("appends Discord context to system array", async () => {
      const state = createMockState(true, "ch_123")
      const hook = createSystemPromptHook(state as any)
      const output = { system: ["existing prompt"] }
      await hook({} as any, output)
      expect(output.system.length).toBe(2)
      expect(output.system[1]).toContain("ch_123")
      expect(output.system[1]).toContain("Discord")
    })

    it("prompt instructs Discord markdown formatting", async () => {
      const state = createMockState(true, "ch_123")
      const hook = createSystemPromptHook(state as any)
      const output: { system: string[] } = { system: [] }
      await hook({} as any, output)
      expect(output.system[0].toLowerCase()).toContain("discord")
    })

    it("does not include sensitive info (no token mention)", async () => {
      const state = createMockState(true, "ch_123")
      const hook = createSystemPromptHook(state as any)
      const output: { system: string[] } = { system: [] }
      await hook({} as any, output)
      const injected = output.system.join(" ")
      expect(injected.toLowerCase()).not.toContain("token")
      expect(injected.toLowerCase()).not.toContain("secret")
      expect(injected.toLowerCase()).not.toContain("password")
    })

    it("does not inject prompt for different sessionID", async () => {
      const state = createMockState(true, "ch_123", "ses_main")
      const hook = createSystemPromptHook(state as any)
      const output: { system: string[] } = { system: ["existing"] }

      await hook({ sessionID: "ses_other" } as any, output)

      expect(output.system).toEqual(["existing"])
    })
  })

  describe("given disconnected state", () => {
    it("does NOT modify system array when not connected", async () => {
      const state = createMockState(false)
      const hook = createSystemPromptHook(state as any)
      const output = { system: ["existing prompt"] }
      await hook({} as any, output)
      expect(output.system).toHaveLength(1)
      expect(output.system[0]).toBe("existing prompt")
    })
  })
})
