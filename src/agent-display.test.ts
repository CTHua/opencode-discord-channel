import { describe, it, expect } from "bun:test"
import { buildAgentEmbed, buildAgentButtons, parseButtonInteraction } from "./agent-display"
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

describe("buildAgentButtons", () => {
  describe("given empty agent list", () => {
    it("returns empty array", () => {
      const rows = buildAgentButtons([], "oracle")
      expect(rows).toHaveLength(0)
    })
  })

  describe("given agents up to 5", () => {
    it("returns a single row", () => {
      const rows = buildAgentButtons(sampleAgents, "oracle")
      expect(rows).toHaveLength(1)
    })
    it("each agent gets one button", () => {
      const rows = buildAgentButtons(sampleAgents, "oracle")
      const totalButtons = rows.reduce((sum, row) => sum + row.toJSON().components.length, 0)
      expect(totalButtons).toBe(sampleAgents.length)
    })
  })

  describe("given more than 5 agents", () => {
    it("splits into multiple rows with max 5 per row", () => {
      const manyAgents: AgentInfo[] = Array.from({ length: 8 }, (_, i) => ({
        name: `agent${i}`,
        mode: "primary" as const,
      }))
      const rows = buildAgentButtons(manyAgents, "agent0")
      expect(rows.length).toBeGreaterThan(1)
      rows.forEach(row => {
        expect(row.toJSON().components.length).toBeLessThanOrEqual(5)
      })
    })

    it("total button count equals agent count", () => {
      const manyAgents: AgentInfo[] = Array.from({ length: 8 }, (_, i) => ({
        name: `agent${i}`,
        mode: "primary" as const,
      }))
      const rows = buildAgentButtons(manyAgents, "agent0")
      const totalButtons = rows.reduce((sum, row) => sum + row.toJSON().components.length, 0)
      expect(totalButtons).toBe(8)
    })
  })

  describe("given current agent", () => {
    it("current agent button has different style (primary)", () => {
      const rows = buildAgentButtons(sampleAgents, "oracle")
      const allButtons = rows.flatMap(row => row.toJSON().components) as Array<{ custom_id?: string; style?: number }>
      const oracleBtn = allButtons.find(b => b.custom_id === "agent_switch_oracle")
      expect(oracleBtn?.style).toBe(1)
    })
    it("other agent buttons are secondary style", () => {
      const rows = buildAgentButtons(sampleAgents, "oracle")
      const allButtons = rows.flatMap(row => row.toJSON().components) as Array<{ custom_id?: string; style?: number }>
      const sisyphusBtn = allButtons.find(b => b.custom_id === "agent_switch_sisyphus")
      expect(sisyphusBtn?.style).toBe(2)
    })
  })
})

describe("parseButtonInteraction", () => {
  it("extracts agent name from agent_switch_ prefix", () => {
    expect(parseButtonInteraction("agent_switch_oracle")).toBe("oracle")
    expect(parseButtonInteraction("agent_switch_sisyphus")).toBe("sisyphus")
  })

  it("returns null for non-agent-switch customIds", () => {
    expect(parseButtonInteraction("some_other_button")).toBeNull()
    expect(parseButtonInteraction("")).toBeNull()
  })
})
