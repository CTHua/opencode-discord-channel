type CodeBlockState = {
  inBlock: boolean
  lang: string
}

function getCodeBlockState(text: string, upTo: number): CodeBlockState {
  let inBlock = false
  let lang = ""

  let i = 0
  while (i < upTo) {
    if (text[i] === "`" && text[i + 1] === "`" && text[i + 2] === "`") {
      if (!inBlock) {
        inBlock = true
        let j = i + 3
        let currentLang = ""
        while (j < upTo && text[j] !== "\n") {
          currentLang += text[j]
          j++
        }
        lang = currentLang.trim()
        i = j
      } else {
        inBlock = false
        lang = ""
        i += 3
      }
      continue
    }

    i++
  }

  return { inBlock, lang }
}

function findSplitPoint(text: string, limit: number, minIndex = 0): number {
  const newlineIndex = text.lastIndexOf("\n", limit - 1)
  if (newlineIndex >= 0) {
    const cut = newlineIndex + 1
    if (cut > minIndex) return cut
  }

  const spaceIndex = text.lastIndexOf(" ", limit - 1)
  if (spaceIndex >= 0) {
    const cut = spaceIndex + 1
    if (cut > minIndex) return cut
  }

  return limit
}

export function splitMessage(text: string, maxLength = 2000): string[] {
  if (!text || text.length === 0) return []
  if (text.length <= maxLength) return [text]

  const state = getCodeBlockState(text, maxLength)
  if (state.inBlock) {
    const closeMarker = "\n```"
    const splitLimit = Math.max(1, maxLength - closeMarker.length)
    const firstLineBreak = text.indexOf("\n")
    const splitAt = findSplitPoint(
      text,
      splitLimit,
      firstLineBreak >= 0 ? firstLineBreak + 1 : 0,
    )
    const chunk = text.slice(0, splitAt) + closeMarker
    const remaining = `\`\`\`${state.lang ? state.lang : ""}\n${text.slice(splitAt)}`
    return [chunk, ...splitMessage(remaining, maxLength)]
  }

  const splitAt = findSplitPoint(text, maxLength)
  const chunk = text.slice(0, splitAt)
  const remaining = text.slice(splitAt)

  if (remaining.length === 0) {
    return [chunk]
  }

  return [chunk, ...splitMessage(remaining, maxLength)]
}
