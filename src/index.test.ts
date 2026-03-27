import { describe, it, expect, beforeEach, afterAll } from "bun:test"

const pluginModule = await import("./index")
const plugin = pluginModule.default

const mockCtx = {
  client: {
    session: { promptAsync: async () => {} },
    app: { agents: async () => ({ data: [] }) },
  },
  project: { id: "test-project" },
  directory: "/test",
  worktree: "/test",
  serverUrl: new URL("http://localhost:4096"),
}

const origBotToken = process.env.DISCORD_BOT_TOKEN
const origOwnerId = process.env.DISCORD_OWNER_ID

function cleanEnv() {
  delete process.env.DISCORD_BOT_TOKEN
  delete process.env.DISCORD_OWNER_ID
}

function restoreEnv() {
  if (origBotToken !== undefined) process.env.DISCORD_BOT_TOKEN = origBotToken
  else delete process.env.DISCORD_BOT_TOKEN
  if (origOwnerId !== undefined) process.env.DISCORD_OWNER_ID = origOwnerId
  else delete process.env.DISCORD_OWNER_ID
}

describe("opencode-discord-channel plugin", () => {
  beforeEach(() => {
    cleanEnv()
  })

  afterAll(() => {
    restoreEnv()
  })

  describe("plugin() default export", () => {
    it("is an async function", () => {
      expect(typeof plugin).toBe("function")
    })

    it("returns a Hooks object", async () => {
      const hooks = await plugin(mockCtx as any)
      expect(hooks).toBeObject()
    })

    it("includes config hook", async () => {
      const hooks = await plugin(mockCtx as any)
      expect(typeof hooks.config).toBe("function")
    })

    it("includes command.execute.before hook", async () => {
      const hooks = await plugin(mockCtx as any)
      expect(typeof hooks["command.execute.before"]).toBe("function")
    })

    it("includes event hook", async () => {
      const hooks = await plugin(mockCtx as any)
      expect(typeof hooks.event).toBe("function")
    })

    it("includes experimental.chat.system.transform hook", async () => {
      const hooks = await plugin(mockCtx as any)
      expect(typeof hooks["experimental.chat.system.transform"]).toBe(
        "function",
      )
    })
  })

  describe("config hook registers commands", () => {
    it("registers dc:connect command with $ARGUMENTS in template", async () => {
      const hooks = await plugin(mockCtx as any)
      const config: any = { command: {} }
      await hooks.config!(config)
      expect(config.command["dc:connect"]).toBeDefined()
      expect(config.command["dc:connect"].template).toContain("$ARGUMENTS")
    })

    it("registers dc:disconnect command", async () => {
      const hooks = await plugin(mockCtx as any)
      const config: any = { command: {} }
      await hooks.config!(config)
      expect(config.command["dc:disconnect"]).toBeDefined()
      expect(config.command["dc:disconnect"].template).toBeDefined()
    })

    it("registers dc:status command", async () => {
      const hooks = await plugin(mockCtx as any)
      const config: any = { command: {} }
      await hooks.config!(config)
      expect(config.command["dc:status"]).toBeDefined()
      expect(config.command["dc:status"].template).toBeDefined()
    })

    it("initialises config.command when it is undefined", async () => {
      const hooks = await plugin(mockCtx as any)
      const config: any = {}
      await hooks.config!(config)
      expect(config.command).toBeDefined()
      expect(config.command["dc:connect"]).toBeDefined()
    })

    it("includes description for each command", async () => {
      const hooks = await plugin(mockCtx as any)
      const config: any = { command: {} }
      await hooks.config!(config)
      expect(config.command["dc:connect"].description).toBeDefined()
      expect(config.command["dc:disconnect"].description).toBeDefined()
      expect(config.command["dc:status"].description).toBeDefined()
    })
  })

  describe("command.execute.before hook", () => {
    it("handles dc:connect with missing DISCORD_BOT_TOKEN — returns error", async () => {
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        { command: "dc:connect", sessionID: "ses_test", arguments: "123456789" },
        output,
      )
      expect(output.parts.length).toBeGreaterThan(0)
      const text = (output.parts[0] as any).text ?? ""
      expect(text).toContain("DISCORD_BOT_TOKEN")
    })

    it("handles dc:connect with missing channel ID argument — returns error", async () => {
      process.env.DISCORD_BOT_TOKEN = "test-token"
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        { command: "dc:connect", sessionID: "ses_test", arguments: "" },
        output,
      )
      expect(output.parts.length).toBeGreaterThan(0)
      const text = (output.parts[0] as any).text ?? ""
      expect(text.toLowerCase()).toContain("channel")
    })

    it("handles dc:connect with whitespace-only channel ID — returns error", async () => {
      process.env.DISCORD_BOT_TOKEN = "test-token"
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        { command: "dc:connect", sessionID: "ses_test", arguments: "   " },
        output,
      )
      expect(output.parts.length).toBeGreaterThan(0)
      const text = (output.parts[0] as any).text ?? ""
      expect(text.toLowerCase()).toContain("channel")
    })

    it("handles dc:connect with missing DISCORD_OWNER_ID — returns error", async () => {
      process.env.DISCORD_BOT_TOKEN = "test-token"
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        {
          command: "dc:connect",
          sessionID: "ses_test",
          arguments: "123456789",
        },
        output,
      )
      expect(output.parts.length).toBeGreaterThan(0)
      const text = (output.parts[0] as any).text ?? ""
      expect(text).toContain("DISCORD_OWNER_ID")
    })

    it("handles dc:status and returns connection state text", async () => {
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        { command: "dc:status", sessionID: "ses_test", arguments: "" },
        output,
      )
      expect(output.parts.length).toBeGreaterThan(0)
      const text = (output.parts[0] as any).text ?? ""
      expect(text.toLowerCase()).toContain("status")
    })

    it("dc:status shows 'Not connected' when disconnected", async () => {
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        { command: "dc:status", sessionID: "ses_test", arguments: "" },
        output,
      )
      const text = (output.parts[0] as any).text ?? ""
      expect(text).toContain("Not connected")
    })

    it("handles dc:disconnect and returns confirmation", async () => {
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        { command: "dc:disconnect", sessionID: "ses_test", arguments: "" },
        output,
      )
      expect(output.parts.length).toBeGreaterThan(0)
      const text = (output.parts[0] as any).text ?? ""
      expect(text.toLowerCase()).toContain("disconnect")
    })

    it("ignores unknown commands — parts remain empty", async () => {
      const hooks = await plugin(mockCtx as any)
      const output = { parts: [] as any[] }
      await hooks["command.execute.before"]!(
        { command: "other:command", sessionID: "ses_test", arguments: "" },
        output,
      )
      expect(output.parts).toHaveLength(0)
    })
  })
})
