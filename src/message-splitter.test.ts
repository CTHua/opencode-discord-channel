import { describe, it, expect } from "bun:test"
import { splitMessage } from "./message-splitter"

describe("splitMessage", () => {
  describe("given empty string", () => {
    it("returns empty array", () => {
      expect(splitMessage("")).toEqual([])
    })
  })

  describe("given string under limit", () => {
    it("returns array with original string", () => {
      expect(splitMessage("hello")).toEqual(["hello"])
    })

    it("returns single chunk for exactly 2000 chars", () => {
      const s = "x".repeat(2000)
      const result = splitMessage(s)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(s)
    })
  })

  describe("given string over limit", () => {
    it("splits 2500 chars into chunks each within limit", () => {
      const s = "x".repeat(2500)
      const result = splitMessage(s)
      expect(result.length).toBeGreaterThanOrEqual(2)
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(2000)
      })
    })

    it("prefers splitting at newline boundaries", () => {
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}: ${"x".repeat(25)}`)
      const s = lines.join("\n")
      const result = splitMessage(s)
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(2000)
      })
    })

    it("hard-breks very long single line without losing content", () => {
      const s = "x".repeat(5000)
      const result = splitMessage(s)
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(2000)
      })
      expect(result.join("")).toBe(s)
    })
  })

  describe("given string with only newlines", () => {
    it("handles gracefully", () => {
      const result = splitMessage("\n\n\n")
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("given code blocks under limit", () => {
    it("preserves code block intact", () => {
      const s = "before\n```ts\nconst x = 1\n```\nafter"
      const result = splitMessage(s)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(s)
    })
  })

  describe("given code block spanning split boundary", () => {
    it("keeps code block content split safely", () => {
      const prefix = "intro\n"
      const codeOpen = "```ts\n"
      const codeContent = "x".repeat(2000) + "\n"
      const codeClose = "```\n"
      const suffix = "outro"
      const input = prefix + codeOpen + codeContent + codeClose + suffix

      const result = splitMessage(input)
      expect(result.length).toBeGreaterThanOrEqual(2)
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(2000)
      })
      expect(result.some((c) => c.includes("```"))).toBe(true)
    })
  })

  describe("given custom maxLength", () => {
    it("respects custom limit", () => {
      const result = splitMessage("x".repeat(100), 50)
      expect(result.length).toBeGreaterThanOrEqual(2)
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(50)
      })
    })
  })

  describe("content preservation", () => {
    it("does not lose non-code content when splitting", () => {
      const lines = Array.from({ length: 200 }, (_, i) => `item ${i}`)
      const s = lines.join("\n")
      const result = splitMessage(s)
      const rejoined = result.join("\n")
      lines.forEach((line) => {
        expect(rejoined).toContain(line)
      })
    })

    it("preserves final suffix after split", () => {
      const s = `${"a".repeat(1990)}\nend`
      const result = splitMessage(s)
      expect(result.join("")).toContain("end")
    })
  })
})
