import { describe, it, expect } from "bun:test"
import {
  buildAgentEmbed,
  buildAgentSelectMenu,
  parseSelectInteraction,
} from "./agent-display"
import type { AgentInfo } from "./types"

const sampleAgents: AgentInfo[] = [
  { name: "sisyphus", mode: "primary", color: "#5865F2" },
  { name: "oracle", mode: "subagent", color: "#57F287" },
  { name: "explore", mode: "subagent", color: "#FEE75C" },
]

describe("buildAgentEmbed", () => {
  describe("given agent name and color", () => {
    it("sets title to agent name", () => {
      const embed = buildAgentEmbed("oracle", "#57F287")
      const data = embed.toJSON()
      expect(data.title).toBe("oracle")
    })

    it("sets color from hex string", () => {
      const embed = buildAgentEmbed("oracle", "#57F287")
      const data = embed.toJSON()
      expect(data.color).toBeTruthy()
    })

    it("works without color", () => {
      const embed = buildAgentEmbed("oracle")
      const data = embed.toJSON()
      expect(data.title).toBe("oracle")
    })

    it("includes status in description when provided", () => {
      const embed = buildAgentEmbed("oracle", undefined, "generating...")
      const data = embed.toJSON()
      expect(data.description).toContain("generating...")
    })
  })
})

describe("buildAgentSelectMenu", () => {
  describe("given empty agent list", () => {
    it("returns empty array", () => {
      const rows = buildAgentSelectMenu([], "oracle")
      expect(rows).toHaveLength(0)
    })
  })

  describe("given agents with mixed modes", () => {
    it("filters out subagents", () => {
      const rows = buildAgentSelectMenu(sampleAgents, "sisyphus")
      expect(rows).toHaveLength(1)
      const json = rows[0].toJSON()
      const options = json.components[0].options
      expect(options).toHaveLength(1)
      expect(options[0].value).toBe("sisyphus")
    })
  })

  describe("given only subagents", () => {
    it("returns empty array", () => {
      const subagentsOnly: AgentInfo[] = [
        { name: "oracle", mode: "subagent" },
        { name: "explore", mode: "subagent" },
      ]
      const rows = buildAgentSelectMenu(subagentsOnly, "oracle")
      expect(rows).toHaveLength(0)
    })
  })

  describe("given many primary agents", () => {
    it("caps at 25 options", () => {
      const manyAgents: AgentInfo[] = Array.from({ length: 30 }, (_, i) => ({
        name: `agent${i}`,
        mode: "primary" as const,
      }))
      const rows = buildAgentSelectMenu(manyAgents, "agent0")
      expect(rows).toHaveLength(1)
      const json = rows[0].toJSON()
      expect(json.components[0].options).toHaveLength(25)
    })
  })

  describe("given current agent", () => {
    it("marks current agent as default", () => {
      const agents: AgentInfo[] = [
        { name: "sisyphus", mode: "primary" },
        { name: "metis", mode: "primary" },
      ]
      const rows = buildAgentSelectMenu(agents, "metis")
      const json = rows[0].toJSON()
      const options = json.components[0].options
      const metisOption = options.find(
        (o: { value: string }) => o.value === "metis",
      )
      const sisyphusOption = options.find(
        (o: { value: string }) => o.value === "sisyphus",
      )
      expect(metisOption?.default).toBe(true)
      expect(sisyphusOption?.default).toBe(false)
    })
  })

  describe("given agents with descriptions", () => {
    it("includes description in options", () => {
      const agents: AgentInfo[] = [
        {
          name: "sisyphus",
          mode: "primary",
          description: "Main orchestrator",
        },
      ]
      const rows = buildAgentSelectMenu(agents, "sisyphus")
      const json = rows[0].toJSON()
      expect(json.components[0].options[0].description).toBe(
        "Main orchestrator",
      )
    })
  })
})

describe("parseSelectInteraction", () => {
  it("extracts agent name from select menu values", () => {
    expect(parseSelectInteraction("agent_select", ["oracle"])).toBe("oracle")
    expect(parseSelectInteraction("agent_select", ["sisyphus"])).toBe(
      "sisyphus",
    )
  })

  it("returns null for non-matching customId", () => {
    expect(parseSelectInteraction("other_menu", ["oracle"])).toBeNull()
  })

  it("returns null for empty values", () => {
    expect(parseSelectInteraction("agent_select", [])).toBeNull()
  })
})
