# OpenCode SDK HTTP Client - Quick Reference

## Setup

```typescript
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";

// Option 1: Use existing server
const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
});

// Option 2: Spawn server + create client
const server = await createOpencodeServer({
    hostname: "127.0.0.1",
    port: 4096,
    timeout: 10000,
});

const client = createOpencodeClient({
    baseUrl: server.url,
});

// Cleanup
server.close();
```

## Core Workflow

```typescript
// 1. Create session
const { data: session } = await client.session.create({
    body: { title: "My CLI Task" },
    query: { directory: "/path/to/project" },
});

// 2. Send prompt (non-blocking)
await client.session.promptAsync({
    path: { id: session.id },
    body: {
        parts: [
            { type: "text", text: "Implement a feature" }
        ],
    },
});

// 3. Listen for events
const eventResult = await client.global.event({
    onSseEvent: (event) => {
        const { payload } = event.data;
        
        if (payload.type === "message.part.updated") {
            console.log(payload.properties.part.text);
        }
        
        if (payload.type === "session.idle") {
            console.log("✅ Done!");
        }
    },
    onSseError: (error) => {
        console.error("Stream error:", error);
    },
    sseMaxRetryAttempts: 5,
});

// 4. Iterate stream (optional)
for await (const event of eventResult.stream) {
    // Handle events
}
```

## Common Patterns

### Send Text Prompt
```typescript
await client.session.promptAsync({
    path: { id: sessionId },
    body: {
        parts: [
            { type: "text", text: "Your prompt here" }
        ],
    },
});
```

### Send File Reference
```typescript
await client.session.promptAsync({
    path: { id: sessionId },
    body: {
        parts: [
            { type: "file", mime: "text/plain", url: "file:///path/to/file" }
        ],
    },
});
```

### Specify Model
```typescript
await client.session.promptAsync({
    path: { id: sessionId },
    body: {
        model: {
            providerID: "openai",
            modelID: "gpt-4",
        },
        parts: [{ type: "text", text: "..." }],
    },
});
```

### Specify Agent
```typescript
await client.session.promptAsync({
    path: { id: sessionId },
    body: {
        agent: "code-review",
        parts: [{ type: "text", text: "..." }],
    },
});
```

### Fork Session
```typescript
const { data: forked } = await client.session.create({
    body: {
        title: "Forked session",
        parentID: originalSessionId,
    },
});
```

### Get Session Messages
```typescript
const { data: messages } = await client.session.messages({
    path: { id: sessionId },
});

messages.forEach(msg => {
    console.log(msg.role, msg.id);
});
```

### Get Session Diff
```typescript
const { data: diff } = await client.session.diff({
    path: { id: sessionId },
});

diff.forEach(file => {
    console.log(`${file.file}: +${file.additions} -${file.deletions}`);
});
```

## Event Types to Handle

```typescript
// Streaming response text
if (event.type === "message.part.updated") {
    const { part, delta } = event.properties;
    if (part.type === "text") {
        console.log(delta || part.text);
    }
}

// Tool execution
if (event.type === "message.part.updated") {
    const { part } = event.properties;
    if (part.type === "tool") {
        console.log(`Tool: ${part.tool} - ${part.state.status}`);
    }
}

// Session completion
if (event.type === "session.idle") {
    console.log("Session finished");
}

// Status changes
if (event.type === "session.status") {
    console.log(`Status: ${event.properties.status.type}`);
}

// Errors
if (event.type === "session.error") {
    console.error("Session error:", event.properties.error);
}

// Message metadata
if (event.type === "message.updated") {
    const msg = event.properties.info;
    console.log(`Tokens: ${msg.tokens.input}/${msg.tokens.output}`);
    console.log(`Cost: $${msg.cost}`);
}
```

## Error Handling

```typescript
// Pattern 1: Check error field
const { data, error } = await client.session.create({
    body: { title: "Test" },
});

if (error) {
    if (error.name === "NotFoundError") {
        console.error("Session not found");
    } else if (error.name === "ProviderAuthError") {
        console.error("Auth failed:", error.data.message);
    }
}

// Pattern 2: Throw on error
try {
    const session = await client.session.create(
        { body: { title: "Test" } },
        { throwOnError: true }
    );
} catch (error) {
    console.error("Failed:", error);
}

// Pattern 3: SSE errors
await client.global.event({
    onSseError: (error) => {
        console.error("Stream error:", error);
        // Reconnect logic here
    },
});
```

## Tips & Tricks

### Stream Response to Console
```typescript
let fullText = "";

await client.global.event({
    onSseEvent: (event) => {
        if (event.data.payload.type === "message.part.updated") {
            const { delta, part } = event.data.payload.properties;
            if (part.type === "text") {
                process.stdout.write(delta || "");
                fullText += delta || "";
            }
        }
    },
});

console.log("\n✅ Full response:", fullText);
```

### Wait for Session Idle
```typescript
const sessionIdle = new Promise<void>((resolve) => {
    client.global.event({
        onSseEvent: (event) => {
            if (event.data.payload.type === "session.idle" &&
                event.data.payload.properties.sessionID === sessionId) {
                resolve();
            }
        },
    });
});

await client.session.promptAsync({
    path: { id: sessionId },
    body: { parts: [{ type: "text", text: "..." }] },
});

await sessionIdle;
console.log("Done!");
```

### Collect All Parts
```typescript
const parts: Part[] = [];

await client.global.event({
    onSseEvent: (event) => {
        if (event.data.payload.type === "message.part.updated") {
            parts.push(event.data.payload.properties.part);
        }
    },
});

// Later: access all parts
parts.forEach(part => {
    if (part.type === "text") console.log(part.text);
    if (part.type === "tool") console.log(`Tool: ${part.tool}`);
});
```

### Filter Events by Directory
```typescript
await client.global.event({
    onSseEvent: (event) => {
        if (event.data.directory !== "/my/project") return;
        
        // Process only events from /my/project
        const { payload } = event.data;
        // ...
    },
});
```

### Custom Retry Logic
```typescript
await client.global.event({
    sseDefaultRetryDelay: 1000,
    sseMaxRetryDelay: 10000,
    sseSleepFn: async (ms) => {
        console.log(`Retrying in ${ms}ms...`);
        await new Promise(r => setTimeout(r, ms));
    },
});
```

## Gotchas

❌ **Don't** expect response body from `promptAsync()`
- Returns 204 No Content
- Listen to SSE events instead

❌ **Don't** forget to filter events by directory
- `global.event()` returns ALL events
- Check `event.data.directory` manually

❌ **Don't** poll for completion
- Use `session.idle` event instead
- No polling mechanism needed

❌ **Don't** edit message parts
- Parts are immutable
- Use revert/unrevert instead

❌ **Don't** assume tool execution is synchronous
- Tool parts have async state changes
- Listen to `message.part.updated` for state

## API Reference

| Method | Purpose |
|--------|---------|
| `client.session.create()` | Create new session |
| `client.session.list()` | List all sessions |
| `client.session.get()` | Get session details |
| `client.session.promptAsync()` | Send prompt (non-blocking) |
| `client.session.messages()` | List messages |
| `client.session.diff()` | Get file changes |
| `client.session.abort()` | Stop session |
| `client.session.fork()` | Fork at message |
| `client.global.event()` | Subscribe to events |
| `client.app.agents()` | List available agents |
| `client.config.get()` | Get config |
| `client.file.read()` | Read file |
| `client.find.text()` | Search files |

## Environment Variables

```bash
# Server password (if needed)
export OPENCODE_SERVER_PASSWORD="your-password"

# Server config (JSON)
export OPENCODE_CONFIG_CONTENT='{"logLevel":"debug"}'
```

