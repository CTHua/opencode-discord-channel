# opencode-discord-channel

An [OpenCode](https://opencode.ai) plugin that bridges a Discord bot to your OpenCode session. Send messages from Discord into your session and receive AI responses back — with agent display and switching via Discord dropdown menu.

## Features

- **Bidirectional messaging**: Discord messages forwarded to OpenCode session; AI text responses sent back to Discord
- **Agent display**: Current agent shown in Discord embed after each response
- **Agent switching**: Select from a dropdown menu to switch between agents (subagents hidden)
- **Bot owner-only access control**: Only you can interact via Discord
- **Long message support**: Responses > 2000 chars split intelligently, preserving code blocks
- **Typing indicator**: Discord shows typing... while AI generates
- **Persistent config**: Save bot token and settings to a config file — no env vars needed every time

## Requirements

- OpenCode with oh-my-openagent installed
- A Discord bot application ([create one here](https://discord.com/developers/applications))
- Discord bot token and bot owner ID

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-discord-channel"]
}
```

Or with a specific version:

```json
{
  "plugin": ["opencode-discord-channel@0.1.0"]
}
```

## Configuration

### Option 1: Config File (Recommended)

Create `~/.config/opencode/discord-channel.json`:

```json
{
  "botToken": "your-bot-token-here",
  "ownerId": "your-discord-user-id"
}
```

### Option 2: Environment Variables

```bash
export DISCORD_BOT_TOKEN="your-bot-token-here"
export DISCORD_OWNER_ID="your-discord-user-id"
```

Environment variables take priority over the config file.

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application → Bot section → Reset Token to get your bot token
3. Enable these **Privileged Gateway Intents**: Server Members Intent, Message Content Intent
4. Copy your bot token
5. Get your Discord User ID: User Settings → Advanced → Enable Developer Mode, then right-click your name → Copy User ID
6. Invite the bot to your server with `Send Messages`, `Read Message History`, `View Channels` permissions

## Usage

### Connect the Discord Bridge

```
/dc:connect <channel_id>
```

Get the channel ID by right-clicking a Discord channel (with Developer Mode enabled) → Copy Channel ID.

After the first successful connection, the channel ID is saved. Next time you can just run:

```
/dc:connect
```

### Disconnect

```
/dc:disconnect
```

### Check Status

```
/dc:status
```

### Switch Agents from Discord

After the bridge is connected, each AI response includes a dropdown menu showing available agents. Select any agent to switch for your next message. Only primary agents are shown — subagents are hidden to keep the list clean.

## How It Works

1. You type a message in the Discord channel
2. The plugin forwards it to your OpenCode session
3. OpenCode generates a response
4. The response is sent back to Discord (split if > 2000 chars)
5. A dropdown shows available agents for switching

## Compatible with oh-my-openagent

The plugin reads available agents dynamically from OpenCode and displays them in the dropdown. It works with any agent configuration in your `oh-my-openagent.json`.

## Security

- Only messages from the configured owner ID are forwarded to the session
- The bot token is never logged or exposed
- The bridge only connects to a single specified channel
- Config file stored in user's home directory with standard permissions

## License

MIT
