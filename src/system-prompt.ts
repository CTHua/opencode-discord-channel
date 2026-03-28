import type { ConnectionStateManager } from "./state"

export function createSystemPromptHook(
  state: Pick<
    ConnectionStateManager,
    "isConnected" | "getChannelId" | "getSessionId"
  >,
) {
  return async function systemPromptTransform(
    input: { sessionID?: string; model?: unknown },
    output: { system: string[] },
  ): Promise<void> {
    if (!state.isConnected()) return
    if (input.sessionID && input.sessionID !== state.getSessionId()) return

    const channelId = state.getChannelId()
    output.system.push(
      `You are connected to Discord channel #${channelId}. ` +
        `Your text responses are forwarded to Discord users. ` +
        `Format your responses using Discord-compatible markdown (bold with **text**, code with \`code\`, code blocks with \`\`\`lang\\ncode\\n\`\`\`). ` +
        `Keep responses concise when possible. ` +
        `Do not use HTML tags.`,
    )
  }
}
