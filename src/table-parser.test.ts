import { describe, expect, it } from "bun:test"
import { parseContentWithTables, hasTable } from "./table-parser"

describe("table-parser", () => {
  describe("hasTable", () => {
    it("returns true for text with a markdown table", () => {
      const text = "| Name | Value |\n|------|-------|\n| foo  | bar   |"
      expect(hasTable(text)).toBe(true)
    })

    it("returns false for plain text", () => {
      expect(hasTable("just some text")).toBe(false)
    })

    it("returns false for text with pipes but no separator row", () => {
      expect(hasTable("foo | bar\nbaz | qux")).toBe(false)
    })
  })

  describe("parseContentWithTables", () => {
    it("returns single text segment for plain text", () => {
      const segments = parseContentWithTables("hello world")
      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe("text")
      if (segments[0].type === "text") {
        expect(segments[0].content).toBe("hello world")
      }
    })

    it("parses a standalone table", () => {
      const text = "| Key | Value |\n|-----|-------|\n| a   | 1     |\n| b   | 2     |"
      const segments = parseContentWithTables(text)
      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe("table")
    })

    it("splits text before and after a table", () => {
      const text = "Before text\n\n| Key | Value |\n|-----|-------|\n| a   | 1     |\n\nAfter text"
      const segments = parseContentWithTables(text)
      expect(segments).toHaveLength(3)
      expect(segments[0].type).toBe("text")
      expect(segments[1].type).toBe("table")
      expect(segments[2].type).toBe("text")
      if (segments[0].type === "text") {
        expect(segments[0].content).toContain("Before text")
      }
      if (segments[2].type === "text") {
        expect(segments[2].content).toContain("After text")
      }
    })

    it("handles table without leading pipes", () => {
      const text = "Key | Value\n----|------\na   | 1"
      const segments = parseContentWithTables(text)
      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe("table")
    })

    it("handles two-column table as name/value fields", () => {
      const text = "| Feature | Status |\n|---------|--------|\n| Auth | Done |\n| API | WIP |"
      const segments = parseContentWithTables(text)
      expect(segments).toHaveLength(1)
      if (segments[0].type === "table") {
        const fields = segments[0].embed.data.fields
        expect(fields).toHaveLength(2)
        expect(fields![0].name).toBe("Auth")
        expect(fields![0].value).toBe("Done")
        expect(fields![1].name).toBe("API")
        expect(fields![1].value).toBe("WIP")
      }
    })

    it("handles multi-column table", () => {
      const text = "| Name | Type | Default |\n|------|------|---------|\n| port | int  | 3000    |"
      const segments = parseContentWithTables(text)
      expect(segments).toHaveLength(1)
      if (segments[0].type === "table") {
        const fields = segments[0].embed.data.fields
        expect(fields).toHaveLength(1)
        expect(fields![0].name).toBe("port")
        expect(fields![0].value).toContain("**Name**: port")
        expect(fields![0].value).toContain("**Type**: int")
        expect(fields![0].value).toContain("**Default**: 3000")
      }
    })

    it("handles multiple tables in one response", () => {
      const text = [
        "First table:",
        "| A | B |",
        "|---|---|",
        "| 1 | 2 |",
        "",
        "Second table:",
        "| C | D |",
        "|---|---|",
        "| 3 | 4 |",
      ].join("\n")
      const segments = parseContentWithTables(text)
      const tables = segments.filter((s) => s.type === "table")
      expect(tables).toHaveLength(2)
    })

    it("skips empty trailing text", () => {
      const text = "| A | B |\n|---|---|\n| 1 | 2 |\n\n"
      const segments = parseContentWithTables(text)
      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe("table")
    })

    it("caps fields at 25", () => {
      const rows = Array.from({ length: 30 }, (_, i) => `| item${i} | val${i} |`).join("\n")
      const text = `| Key | Value |\n|-----|-------|\n${rows}`
      const segments = parseContentWithTables(text)
      if (segments[0].type === "table") {
        expect(segments[0].embed.data.fields!.length).toBeLessThanOrEqual(25)
      }
    })
  })
})
