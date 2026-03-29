# opencode-discord-channel

An [OpenCode](https://opencode.ai) plugin that bridges a Discord channel to your OpenCode session. Chat with your AI coding assistant from Discord with full bidirectional messaging, interactive question prompts, and agent switching.

## Features

- **Bidirectional messaging** -- Discord messages are forwarded to your OpenCode session; AI responses are sent back to Discord.
- **Question sync** -- When OpenCode asks a question (e.g. file selection, confirmation), it appears in Discord as an interactive embed with a select menu. Pick an answer or type a custom one via modal. The question message auto-deletes after you answer.
- **Agent switching** -- Switch between agents using the `/agents` slash command in Discord or `/dc:agents` in OpenCode. The agent selector auto-deletes after selection or when the next message arrives.
- **Slash commands** -- `/agents` and `/status` are registered as guild commands for instant availability.
- **Owner-only access** -- Only messages from the configured owner ID are forwarded to the session.
- **Long message splitting** -- Responses over 2000 characters are split intelligently, preserving code block formatting.
- **Typing indicator** -- Discord shows "typing..." while the AI generates a response.
- **Persistent config** -- Bot token, owner ID, and channel ID are saved to a config file. No need to re-enter them every time.

## Quick Start

**1. Install the plugin**

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-discord-channel"]
}
```

**2. Configure your bot token**

Create `~/.config/opencode/discord-channel.json`:

```json
{
  "botToken": "your-bot-token-here",
  "ownerId": "your-discord-user-id"
}
```

See [Discord Bot Setup](#discord-bot-setup) below if you don't have a bot yet.

**3. Connect**

In OpenCode, run:

```
/dc:connect <channel_id>
```

The channel ID is saved after the first connection. Next time, just run `/dc:connect`.

## Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Navigate to the **Bot** section and click **Reset Token** to get your bot token.
3. Under **Privileged Gateway Intents**, enable **Server Members Intent** and **Message Content Intent**.
4. Copy your bot token into the config file.
5. To get your Discord User ID: go to **User Settings > Advanced > Enable Developer Mode**, then right-click your username and select **Copy User ID**.
6. Invite the bot to your server using the OAuth2 URL generator with these permissions: **Send Messages**, **Read Message History**, **View Channels**, **Use Application Commands**.

## Configuration

### Config File (Recommended)

`~/.config/opencode/discord-channel.json`:

```json
{
  "botToken": "your-bot-token-here",
  "ownerId": "your-discord-user-id"
}
```

### Environment Variables

```bash
export DISCORD_BOT_TOKEN="your-bot-token-here"
export DISCORD_OWNER_ID="your-discord-user-id"
```

Environment variables take priority over the config file.

## Commands

### OpenCode Commands

| Command | Description |
|---|---|
| `/dc:connect <channel_id>` | Connect the bridge to a Discord channel. Channel ID is saved for next time. |
| `/dc:connect` | Reconnect to the previously saved channel. |
| `/dc:disconnect` | Disconnect the bridge. |
| `/dc:status` | Show bridge connection status. |
| `/dc:agents` | Show agent selector in Discord. |

### Discord Slash Commands

| Command | Description |
|---|---|
| `/agents` | Show agent selector dropdown. |
| `/status` | Show bridge connection status. |

Slash commands are registered as guild commands when the bridge connects, so they are available instantly.

## How It Works

1. You send a message in the connected Discord channel.
2. The plugin forwards it to your active OpenCode session.
3. OpenCode processes the message and generates a response.
4. The response is sent back to Discord, split across multiple messages if needed.
5. If OpenCode asks a question (file picker, confirmation, etc.), it appears as an interactive embed in Discord.
6. You answer via select menu or type a custom response. The question cleans up after itself.

## Architecture

| Module | Responsibility |
|---|---|
| `index.ts` | Plugin entry point. Wires all modules together, handles commands, question replies, and slash command registration. |
| `bridge-inbound.ts` | Discord to OpenCode. Processes messages, select menu interactions, button clicks, and modal submissions. |
| `bridge-outbound.ts` | OpenCode to Discord. Handles events (message updates, session idle, questions, typing status). |
| `discord-client.ts` | Discord.js wrapper. Manages connection, message sending, interaction handlers, and slash command registration. |
| `question-display.ts` | Renders OpenCode questions as Discord embeds with select menus, custom answer buttons, and modals. |
| `agent-display.ts` | Renders agent selector as Discord embed with select menu. Filters out internal agents. |
| `state.ts` | Connection state, pending questions, and agent menu message tracking. |
| `config.ts` | Config file read/write (`~/.config/opencode/discord-channel.json`). |
| `system-prompt.ts` | Injects Discord formatting instructions into the system prompt. |
| `message-splitter.ts` | Splits long messages at code block and paragraph boundaries. |
| `types.ts` | Shared TypeScript type definitions. |

## Security

- Only messages from the configured owner ID are processed. All other messages are ignored.
- The bot token is never logged or included in error messages.
- The bridge connects to a single channel at a time.
- Config is stored in the user's home directory with standard file permissions.

## Development

```bash
git clone https://github.com/CTHua/opencode-discord-channel.git
cd opencode-discord-channel
pnpm install
pnpm test        # 119 tests
pnpm run build   # outputs to dist/
```

Requires [Bun](https://bun.sh) for building and testing.

## License

MIT
