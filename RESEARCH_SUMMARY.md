# OpenCode SDK HTTP Client Research - Summary

## 📋 Documents Created

This research package includes 4 comprehensive documents:

1. **OPENCODE_SDK_RESEARCH.md** (9 sections, 600+ lines)
   - Complete API reference with all types and signatures
   - Detailed explanations of each component
   - Error handling patterns
   - Authentication details
   - Known limitations and gotchas

2. **OPENCODE_SDK_QUICK_REFERENCE.md** (practical guide)
   - Setup instructions
   - Core workflow example
   - Common patterns (text, files, models, agents)
   - Event handling
   - Error handling patterns
   - Tips & tricks
   - API reference table

3. **OPENCODE_CLI_EXAMPLE.md** (complete examples)
   - Full code review CLI tool
   - Batch processing example
   - Interactive REPL example
   - Key patterns with code
   - Testing examples

4. **RESEARCH_SUMMARY.md** (this file)
   - Quick navigation
   - Key findings
   - Architecture overview

---

## 🎯 Key Findings

### 1. Client Creation
```typescript
const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
    directory?: string,  // Optional: sets x-opencode-directory header
});
```

**API Surface**: 40+ methods across 15+ namespaces (session, project, pty, config, tool, provider, find, file, app, mcp, command, instance, path, vcs)

### 2. Non-Blocking Prompts
```typescript
// Returns 204 No Content immediately
await client.session.promptAsync({
    path: { id: sessionId },
    body: {
        parts: [{ type: "text", text: "..." }],
    },
});
```

**Key**: Must listen to SSE events for completion, no polling needed

### 3. Event Streaming (SSE)
```typescript
await client.global.event({
    onSseEvent: (event) => {
        // event.data.directory: string
        // event.data.payload: Event (union of 30+ event types)
    },
    sseMaxRetryAttempts: 5,
    sseDefaultRetryDelay: 3000,
});
```

**Auto-reconnect**: Exponential backoff (3s → 30s), configurable

### 4. Session Management
```typescript
// Create
const { data: session } = await client.session.create({
    body: { title: "...", parentID?: "..." },
    query: { directory: "/path" },
});

// List
const { data: sessions } = await client.session.list({
    query: { directory: "/path" },
});
```

### 5. Server Spawning
```typescript
const server = await createOpencodeServer({
    hostname: "127.0.0.1",
    port: 4096,
    timeout: 5000,
});

// Returns: { url: string, close(): void }
```

**Spawns**: `opencode serve --hostname=... --port=...`

### 6. Error Handling
```typescript
const { data, error, response } = await client.session.create({...});

if (error) {
    // BadRequestError | NotFoundError | etc.
}
```

**Error Types**: ProviderAuthError, ApiError, MessageAbortedError, MessageOutputLengthError, UnknownError

### 7. Authentication
- Via `OPENCODE_SERVER_PASSWORD` environment variable
- Or via headers: `Authorization: Bearer <token>`
- Supports OAuth, API key, WellKnown auth types

### 8. Key Event Types
| Event | Purpose |
|-------|---------|
| `message.part.updated` | Streaming response text, tool execution |
| `session.idle` | Session completion signal |
| `session.status` | Status changes (idle/busy/retry) |
| `session.error` | Error events |
| `message.updated` | Message metadata (tokens, cost) |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your CLI Tool                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ├─ createOpencodeServer()
                       │  └─ Spawns: opencode serve
                       │
                       └─ createOpencodeClient()
                          ├─ HTTP Requests
                          │  ├─ session.create()
                          │  ├─ session.promptAsync()
                          │  ├─ session.list()
                          │  └─ ... (40+ methods)
                          │
                          └─ SSE Events
                             ├─ global.event()
                             ├─ Auto-reconnect
                             └─ 30+ event types
```

---

## 💡 Workflow Pattern

```
1. Start Server
   createOpencodeServer() → { url, close() }

2. Create Client
   createOpencodeClient({ baseUrl: server.url })

3. Create Session
   client.session.create() → { id, ... }

4. Send Prompt (Non-blocking)
   client.session.promptAsync() → 204 No Content

5. Listen for Events
   client.global.event({
       onSseEvent: (event) => {
           // Handle message.part.updated
           // Handle session.idle
       }
   })

6. Cleanup
   server.close()
```

---

## ⚠️ Critical Gotchas

1. **promptAsync() returns 204 No Content**
   - No response body
   - Must use SSE events

2. **Global events need filtering**
   - `global.event()` returns ALL events
   - Filter by `event.data.directory` manually

3. **Directory context matters**
   - Pass `directory` in query or header
   - Different directories = different state

4. **No polling mechanism**
   - Use `session.idle` event instead
   - No built-in polling

5. **Tool execution is async**
   - Tool parts have state: pending/running/completed/error
   - Listen to `message.part.updated` for changes

6. **Server startup timeout**
   - Default 5000ms may be too short
   - Increase `timeout` option if needed

7. **Message parts are immutable**
   - Can't edit parts after creation
   - Use revert/unrevert instead

8. **No server-side event filtering**
   - All filtering must be client-side
   - Can impact performance with many events

---

## 📊 SDK Version & Dependencies

- **Version**: 1.3.3
- **Type**: ESM (ES Modules)
- **Exports**: 
  - `.` → main client + server
  - `./client` → client only
  - `./server` → server only
  - `./v2` → v2 API (if available)

---

## 🚀 Quick Start

```typescript
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";

// 1. Start server
const server = await createOpencodeServer();

// 2. Create client
const client = createOpencodeClient({ baseUrl: server.url });

// 3. Create session
const { data: session } = await client.session.create({
    body: { title: "My Task" },
});

// 4. Send prompt
await client.session.promptAsync({
    path: { id: session.id },
    body: { parts: [{ type: "text", text: "Hello" }] },
});

// 5. Listen for events
await client.global.event({
    onSseEvent: (event) => {
        if (event.data.payload.type === "message.part.updated") {
            console.log(event.data.payload.properties.part.text);
        }
        if (event.data.payload.type === "session.idle") {
            console.log("Done!");
        }
    },
});

// 6. Cleanup
server.close();
```

---

## 📚 Document Navigation

### For Implementation
→ Start with **OPENCODE_SDK_QUICK_REFERENCE.md**
- Setup instructions
- Common patterns
- Tips & tricks

### For Deep Dive
→ Read **OPENCODE_SDK_RESEARCH.md**
- Complete API reference
- All types and signatures
- Error handling details
- Limitations & gotchas

### For Examples
→ Check **OPENCODE_CLI_EXAMPLE.md**
- Code review CLI
- Batch processing
- Interactive REPL
- Testing patterns

---

## 🔍 Research Methodology

This research was conducted by:

1. **Type Analysis**: Examined all `.d.ts` files in `@opencode-ai/sdk@1.3.3`
2. **Source Code Review**: Analyzed implementation in `dist/*.js`
3. **API Mapping**: Documented all 40+ client methods
4. **Event Types**: Catalogued 30+ event types
5. **Error Handling**: Identified 7 error types
6. **Pattern Recognition**: Extracted common usage patterns
7. **Limitation Analysis**: Identified 10 key gotchas

---

## ✅ Verification Checklist

- [x] `createOpencodeClient()` - Full API surface documented
- [x] `client.session.promptAsync()` - Parameters, response, errors
- [x] `client.event.subscribe()` - SSE configuration, reconnection
- [x] `client.session.create()` and `list()` - Session management
- [x] `createOpencodeServer()` - Spawning, lifecycle, options
- [x] Error handling - All exception types documented
- [x] Authentication - OPENCODE_SERVER_PASSWORD usage
- [x] SSE event format - All key events documented
- [x] Limitations - 10 gotchas identified
- [x] Examples - 3 complete CLI examples provided

---

## 📝 Notes

- SDK is generated from OpenAPI spec (via @hey-api/openapi-ts)
- Uses standard Fetch API for HTTP
- SSE implementation has built-in exponential backoff
- No built-in rate limiting (implement client-side)
- Directory context is critical for multi-project scenarios
- Events are fire-and-forget (no acknowledgment needed)

---

**Research Date**: March 29, 2026  
**SDK Version**: 1.3.3  
**Status**: ✅ Complete

