# OpenCode SDK HTTP Client Mode - Comprehensive Research

**SDK Version**: 1.3.3  
**Research Date**: March 29, 2026  
**Source**: @opencode-ai/sdk node_modules

---

## 1. `createOpencodeClient()` Function

### Full API Surface

```typescript
// Main factory function
export function createOpencodeClient(config?: Config & {
    directory?: string;
}): OpencodeClient;

// Config interface
export interface Config<T extends ClientOptions = ClientOptions> extends Omit<RequestInit, "body" | "headers" | "method">, CoreConfig {
    baseUrl?: T["baseUrl"];
    fetch?: (request: Request) => ReturnType<typeof fetch>;
    parseAs?: "arrayBuffer" | "auto" | "blob" | "formData" | "json" | "stream" | "text";
    responseStyle?: "data" | "fields";  // default: "fields"
    throwOnError?: boolean;  // default: false
}
```

### Return Type: `OpencodeClient`

The client is a class with these main namespaces:

```typescript
client.global.event()           // Subscribe to global events
client.project.list()           // List projects
client.project.current()        // Get current project
client.session.list()           // List sessions
client.session.create()         // Create new session
client.session.get()            // Get session details
client.session.update()         // Update session properties
client.session.delete()         // Delete session
client.session.status()         // Get session status
client.session.prompt()         // Send prompt (blocking)
client.session.promptAsync()    // Send prompt (non-blocking)
client.session.messages()       // List messages in session
client.session.message()        // Get specific message
client.session.command()        // Send command
client.session.shell()          // Run shell command
client.session.abort()          // Abort session
client.session.fork()           // Fork session at message
client.session.revert()         // Revert message
client.session.unrevert()       // Restore reverted messages
client.session.diff()           // Get session diff
client.session.summarize()      // Summarize session
client.session.todo()           // Get todo list
client.session.init()           // Initialize AGENTS.md
client.session.children()       // Get child sessions
client.session.share()          // Share session
client.session.unshare()        // Unshare session
client.pty.list()               // List PTY sessions
client.pty.create()             // Create PTY
client.pty.get()                // Get PTY info
client.pty.update()             // Update PTY
client.pty.remove()             // Remove PTY
client.pty.connect()            // Connect to PTY
client.config.get()             // Get config
client.config.update()          // Update config
client.config.providers()       // List providers
client.tool.ids()               // List tool IDs
client.tool.list()              // List tools with schemas
client.provider.list()          // List providers
client.provider.auth()          // Get auth methods
client.provider.oauth.*         // OAuth operations
client.find.text()              // Find text in files
client.find.files()             // Find files
client.find.symbols()           // Find symbols
client.file.list()              // List files
client.file.read()              // Read file
client.file.status()            // Get file status
client.app.log()                // Write log entry
client.app.agents()             // List agents
client.mcp.status()             // Get MCP status
client.mcp.add()                // Add MCP server
client.mcp.connect()            // Connect MCP server
client.mcp.disconnect()         // Disconnect MCP server
client.mcp.auth.*               // MCP auth operations
client.command.list()           // List commands
client.instance.dispose()       // Dispose instance
client.path.get()               // Get current path
client.vcs.get()                // Get VCS info
```

### Key Options

```typescript
// All requests support:
{
    baseUrl: "http://localhost:4096",  // Required
    fetch?: CustomFetch,               // Custom fetch implementation
    parseAs?: "json" | "text" | "stream" | "auto",
    responseStyle?: "data" | "fields",
    throwOnError?: boolean,
    directory?: string,                // Sets x-opencode-directory header
    // Plus standard RequestInit options (headers, timeout, etc.)
}
```

---

## 2. `client.session.promptAsync()` - Exact Parameters & Response

### Function Signature

```typescript
promptAsync<ThrowOnError extends boolean = false>(
    options: Options<SessionPromptAsyncData, ThrowOnError>
): RequestResult<SessionPromptAsyncResponses, SessionPromptAsyncErrors, ThrowOnError, "fields">
```

### Request Parameters

```typescript
export type SessionPromptAsyncData = {
    body?: {
        messageID?: string;              // Optional: parent message ID
        model?: {
            providerID: string;          // e.g., "openai"
            modelID: string;             // e.g., "gpt-4"
        };
        agent?: string;                  // Agent name to use
        noReply?: boolean;               // Don't wait for reply
        system?: string;                 // System prompt override
        tools?: {
            [key: string]: boolean;      // Tool enable/disable map
        };
        parts: Array<
            TextPartInput | 
            FilePartInput | 
            AgentPartInput | 
            SubtaskPartInput
        >;
    };
    path: {
        id: string;                      // Session ID (required)
    };
    query?: {
        directory?: string;              // Override directory
    };
};

// Part input types:
export type TextPartInput = {
    id?: string;
    type: "text";
    text: string;
    synthetic?: boolean;
    ignored?: boolean;
    time?: { start: number; end?: number };
    metadata?: { [key: string]: unknown };
};

export type FilePartInput = {
    id?: string;
    type: "file";
    mime: string;
    filename?: string;
    url: string;
    source?: FilePartSource;
};

export type AgentPartInput = {
    id?: string;
    type: "agent";
    name: string;
    source?: { value: string; start: number; end: number };
};

export type SubtaskPartInput = {
    id?: string;
    type: "subtask";
    prompt: string;
    description: string;
    agent: string;
};
```

### Response Format

```typescript
export type SessionPromptAsyncResponses = {
    204: void;  // "Prompt accepted" - returns nothing
};

// With responseStyle: "fields" (default):
{
    data: void;
    error: undefined;
    request: Request;
    response: Response;
}

// With responseStyle: "data":
void
```

### Error Cases

```typescript
export type SessionPromptAsyncErrors = {
    400: BadRequestError;  // Invalid request body
    404: NotFoundError;    // Session not found
};

export type BadRequestError = {
    data: unknown;
    errors: Array<{ [key: string]: unknown }>;
    success: false;
};

export type NotFoundError = {
    name: "NotFoundError";
    data: { message: string };
};
```

### Key Behavior

- **Non-blocking**: Returns immediately (204 No Content)
- **Fire-and-forget**: No response body, just acknowledgment
- **Async processing**: Session processes message in background
- **Event-driven**: Listen to `message.part.updated` and `session.idle` events for completion
- **No polling needed**: Use SSE events instead

---

## 3. `client.event.subscribe()` - SSE Event Streaming

### Function Signature

```typescript
// Global events (all directories)
global.event<ThrowOnError extends boolean = false>(
    options?: Options<GlobalEventData, ThrowOnError>
): Promise<ServerSentEventsResult<GlobalEventResponses, unknown>>

// Session-specific events
// Use client.global.event() for all events
```

### SSE Configuration

```typescript
export type ServerSentEventsOptions<TData = unknown> = {
    onSseError?: (error: unknown) => void;
    onSseEvent?: (event: StreamEvent<TData>) => void;
    sseDefaultRetryDelay?: number;      // default: 3000ms
    sseMaxRetryAttempts?: number;       // unlimited if not set
    sseMaxRetryDelay?: number;          // default: 30000ms
    sseSleepFn?: (ms: number) => Promise<void>;  // custom backoff
    url: string;
};

export interface StreamEvent<TData = unknown> {
    data: TData;
    event?: string;
    id?: string;
    retry?: number;
}
```

### Usage Pattern

```typescript
const result = await client.global.event({
    onSseEvent: (event) => {
        console.log(event.data);  // Event payload
    },
    onSseError: (error) => {
        console.error("SSE error:", error);
    },
    sseDefaultRetryDelay: 3000,
    sseMaxRetryAttempts: 5,
});

// Iterate over stream
for await (const event of result.stream) {
    console.log(event);
}
```

### Event Types

```typescript
export type GlobalEvent = {
    directory: string;
    payload: Event;
};

export type Event = 
    | EventServerInstanceDisposed
    | EventInstallationUpdated
    | EventInstallationUpdateAvailable
    | EventLspClientDiagnostics
    | EventLspUpdated
    | EventMessageUpdated
    | EventMessageRemoved
    | EventMessagePartUpdated      // ← Key for streaming responses
    | EventMessagePartRemoved
    | EventPermissionUpdated
    | EventPermissionReplied
    | EventSessionStatus
    | EventSessionIdle             // ← Key for completion detection
    | EventSessionCompacted
    | EventFileEdited
    | EventTodoUpdated
    | EventCommandExecuted
    | EventSessionCreated
    | EventSessionUpdated
    | EventSessionDeleted
    | EventSessionDiff
    | EventSessionError
    | EventFileWatcherUpdated
    | EventVcsBranchUpdated
    | EventTuiPromptAppend
    | EventTuiCommandExecute
    | EventTuiToastShow
    | EventPtyCreated
    | EventPtyUpdated
    | EventPtyExited
    | EventPtyDeleted
    | EventServerConnected;
```

### Key Event Types for CLI

#### `message.part.updated`
```typescript
export type EventMessagePartUpdated = {
    type: "message.part.updated";
    properties: {
        part: Part;
        delta?: string;  // Incremental text for streaming
    };
};

// Part types include:
export type Part = 
    | TextPart
    | ReasoningPart
    | FilePart
    | ToolPart
    | StepStartPart
    | StepFinishPart
    | SnapshotPart
    | PatchPart
    | AgentPart
    | RetryPart
    | CompactionPart
    | SubtaskPart;

export type TextPart = {
    id: string;
    sessionID: string;
    messageID: string;
    type: "text";
    text: string;
    synthetic?: boolean;
    ignored?: boolean;
    time?: { start: number; end?: number };
    metadata?: { [key: string]: unknown };
};

export type ToolPart = {
    id: string;
    sessionID: string;
    messageID: string;
    type: "tool";
    callID: string;
    tool: string;
    state: ToolState;  // pending | running | completed | error
    metadata?: { [key: string]: unknown };
};
```

#### `session.idle`
```typescript
export type EventSessionIdle = {
    type: "session.idle";
    properties: {
        sessionID: string;
    };
};
```

#### `session.status`
```typescript
export type EventSessionStatus = {
    type: "session.status";
    properties: {
        sessionID: string;
        status: SessionStatus;
    };
};

export type SessionStatus = 
    | { type: "idle" }
    | { type: "retry"; attempt: number; message: string; next: number }
    | { type: "busy" };
```

### Reconnection Behavior

- **Automatic retry**: Exponential backoff (3s → 30s max)
- **Configurable**: `sseMaxRetryAttempts`, `sseMaxRetryDelay`
- **Custom backoff**: `sseSleepFn` for custom retry logic
- **Error callback**: `onSseError` for handling failures
- **No manual reconnect needed**: Built-in retry mechanism

---

## 4. `client.session.create()` and `client.session.list()`

### `session.create()`

```typescript
create<ThrowOnError extends boolean = false>(
    options?: Options<SessionCreateData, ThrowOnError>
): RequestResult<SessionCreateResponses, SessionCreateErrors, ThrowOnError, "fields">

export type SessionCreateData = {
    body?: {
        title?: string;
        parentID?: string;  // Fork from existing session
    };
    path?: never;
    query?: {
        directory?: string;
    };
    url: "/session";
};

export type SessionCreateResponses = {
    201: Session;  // Created session
};

export type SessionCreateErrors = {
    400: BadRequestError;
};

export type Session = {
    id: string;
    projectID: string;
    directory: string;
    parentID?: string;
    summary?: {
        additions: number;
        deletions: number;
        files: number;
        diffs?: Array<FileDiff>;
    };
    share?: { url: string };
    title: string;
    version: string;
    time: {
        created: number;
        updated: number;
        compacting?: number;
    };
    revert?: {
        messageID: string;
        partID?: string;
        snapshot?: string;
        diff?: string;
    };
};
```

### `session.list()`

```typescript
list<ThrowOnError extends boolean = false>(
    options?: Options<SessionListData, ThrowOnError>
): RequestResult<SessionListResponses, unknown, ThrowOnError, "fields">

export type SessionListData = {
    body?: never;
    path?: never;
    query?: {
        directory?: string;
    };
    url: "/session";
};

export type SessionListResponses = {
    200: Array<Session>;
};
```

### Usage Example

```typescript
// Create session
const { data: session } = await client.session.create({
    body: {
        title: "My CLI Session",
        parentID: undefined,  // or fork from existing
    },
    query: { directory: "/path/to/project" },
});

// List sessions
const { data: sessions } = await client.session.list({
    query: { directory: "/path/to/project" },
});

console.log(session.id);  // Use for subsequent operations
```

---

## 5. `createOpencodeServer()` - Spawning & Lifecycle

### Function Signature

```typescript
export async function createOpencodeServer(
    options?: ServerOptions
): Promise<{
    url: string;
    close(): void;
}>

export type ServerOptions = {
    hostname?: string;           // default: "127.0.0.1"
    port?: number;               // default: 4096
    signal?: AbortSignal;        // for cancellation
    timeout?: number;            // default: 5000ms
    config?: Config;             // OpenCode config object
};
```

### Implementation Details

```typescript
// Spawns: opencode serve --hostname=127.0.0.1 --port=4096
// Passes config via OPENCODE_CONFIG_CONTENT env var (JSON)
// Waits for: "opencode server listening on https?://..."
// Timeout: 5000ms by default
```

### Usage Pattern

```typescript
const server = await createOpencodeServer({
    hostname: "127.0.0.1",
    port: 4096,
    timeout: 10000,
    config: {
        // OpenCode config
    },
});

console.log(server.url);  // "http://127.0.0.1:4096"

// Use with client
const client = createOpencodeClient({
    baseUrl: server.url,
});

// Cleanup
server.close();  // Kills the process
```

### Lifecycle Management

- **Startup**: Spawns `opencode serve` subprocess
- **Readiness**: Waits for "listening" message in stdout
- **Timeout**: Rejects if not ready within timeout
- **Cleanup**: `close()` kills the process
- **Signal support**: Can pass AbortSignal for cancellation

---

## 6. Error Handling in SDK Client

### Exception Types

```typescript
// Provider authentication errors
export type ProviderAuthError = {
    name: "ProviderAuthError";
    data: {
        providerID: string;
        message: string;
    };
};

// Unknown/generic errors
export type UnknownError = {
    name: "UnknownError";
    data: { message: string };
};

// Message too long
export type MessageOutputLengthError = {
    name: "MessageOutputLengthError";
    data: { [key: string]: unknown };
};

// User aborted
export type MessageAbortedError = {
    name: "MessageAbortedError";
    data: { message: string };
};

// HTTP/API errors
export type ApiError = {
    name: "APIError";
    data: {
        message: string;
        statusCode?: number;
        isRetryable: boolean;
        responseHeaders?: { [key: string]: string };
        responseBody?: string;
    };
};

// HTTP errors
export type BadRequestError = {
    data: unknown;
    errors: Array<{ [key: string]: unknown }>;
    success: false;
};

export type NotFoundError = {
    name: "NotFoundError";
    data: { message: string };
};
```

### Error Handling Patterns

```typescript
// Pattern 1: responseStyle: "fields" (default)
const { data, error, response } = await client.session.create({
    body: { title: "Test" },
});

if (error) {
    console.error("Error:", error);
    // error is BadRequestError | NotFoundError | etc.
}

// Pattern 2: throwOnError: true
try {
    const session = await client.session.create(
        { body: { title: "Test" } },
        { throwOnError: true }
    );
} catch (error) {
    // error is thrown directly
}

// Pattern 3: SSE errors
await client.global.event({
    onSseError: (error) => {
        console.error("Stream error:", error);
        // Handle reconnection logic
    },
});
```

### Network Failure Handling

- **Automatic retry**: SSE has exponential backoff (3s → 30s)
- **Configurable**: `sseMaxRetryAttempts`, `sseMaxRetryDelay`
- **No auto-retry for HTTP**: Regular requests don't auto-retry
- **Manual retry**: Implement your own retry logic for HTTP calls
- **Timeout**: Set via fetch options or RequestInit

---

## 7. Authentication - `OPENCODE_SERVER_PASSWORD`

### How It Works

```typescript
// The SDK uses HTTP Basic Auth or Bearer token
// Password is passed via environment variable or config

// In createOpencodeServer():
// OPENCODE_SERVER_PASSWORD env var is read by opencode CLI

// In createOpencodeClient():
// Pass auth via config or headers
```

### Auth Types in SDK

```typescript
export type OAuth = {
    type: "oauth";
    refresh: string;
    access: string;
    expires: number;
    enterpriseUrl?: string;
};

export type ApiAuth = {
    type: "api";
    key: string;
};

export type WellKnownAuth = {
    type: "wellknown";
    key: string;
    token: string;
};

export type Auth = OAuth | ApiAuth | WellKnownAuth;
```

### Usage

```typescript
// Set password for server
const server = await createOpencodeServer({
    config: {
        // Config with auth settings
    },
});

// Client auth (if needed)
const client = createOpencodeClient({
    baseUrl: server.url,
    headers: {
        "Authorization": "Bearer <token>",
        // or
        "x-api-key": "<key>",
    },
});
```

---

## 8. SSE Event Format Details

### Message Structure

```typescript
// Raw SSE format:
event: message.part.updated
data: {"part":{"id":"...","type":"text","text":"..."},"delta":"..."}

// Parsed by SDK:
{
    event: "message.part.updated",
    data: {
        part: TextPart | ToolPart | FilePart | ...,
        delta?: string  // Incremental text
    }
}
```

### Key Events for CLI

#### 1. `message.part.updated` - Streaming Response
```typescript
{
    type: "message.part.updated",
    properties: {
        part: {
            id: "part_123",
            sessionID: "sess_456",
            messageID: "msg_789",
            type: "text",
            text: "Full text so far...",
            time: { start: 1234567890, end: 1234567891 }
        },
        delta: "incremental text"  // Only new content
    }
}
```

#### 2. `session.idle` - Completion Signal
```typescript
{
    type: "session.idle",
    properties: {
        sessionID: "sess_456"
    }
}
```

#### 3. `session.status` - Status Changes
```typescript
{
    type: "session.status",
    properties: {
        sessionID: "sess_456",
        status: {
            type: "busy"  // or "idle" or "retry"
        }
    }
}
```

#### 4. `message.updated` - Message Metadata
```typescript
{
    type: "message.updated",
    properties: {
        info: {
            id: "msg_789",
            sessionID: "sess_456",
            role: "assistant",
            time: { created: 1234567890, completed: 1234567891 },
            error?: ProviderAuthError | ApiError | ...,
            tokens: { input: 100, output: 50, ... },
            cost: 0.001
        }
    }
}
```

#### 5. `session.error` - Error Events
```typescript
{
    type: "session.error",
    properties: {
        sessionID: "sess_456",
        error: {
            name: "ProviderAuthError",
            data: {
                providerID: "openai",
                message: "Invalid API key"
            }
        }
    }
}
```

---

## 9. Known Limitations & Gotchas

### HTTP API vs Plugin Hook System

| Feature | HTTP API | Plugin Hook |
|---------|----------|-------------|
| **Startup** | Manual server spawn | Automatic |
| **Lifecycle** | Manual management | Automatic |
| **Authentication** | Via headers/env | Built-in |
| **Event streaming** | SSE (HTTP) | Direct callback |
| **Latency** | Network overhead | In-process |
| **Scalability** | Multiple clients | Single process |
| **Debugging** | Network logs | Direct access |

### Gotchas

1. **`promptAsync()` returns 204 No Content**
   - Don't expect response body
   - Must listen to SSE events for completion
   - No polling mechanism built-in

2. **SSE reconnection is automatic but not infinite**
   - Set `sseMaxRetryAttempts` to prevent infinite loops
   - Exponential backoff can take 30+ seconds
   - Custom `sseSleepFn` needed for different backoff strategies

3. **Directory context matters**
   - Pass `directory` in query or header
   - Different directories = different sessions/state
   - `x-opencode-directory` header overrides query param

4. **Server startup timeout**
   - Default 5000ms may be too short on slow systems
   - Increase `timeout` option if needed
   - No retry mechanism for startup failures

5. **Event filtering**
   - `global.event()` returns ALL events from all directories
   - Filter by `directory` in event payload manually
   - No server-side filtering available

6. **Message parts are immutable**
   - Once created, parts can't be edited
   - Only revert/unrevert operations available
   - Use `messageID` to reference parent messages

7. **Tool execution is async**
   - Tool parts have `state: "pending" | "running" | "completed" | "error"`
   - Listen to `message.part.updated` for state changes
   - No blocking tool execution

8. **Session compaction**
   - Long sessions are auto-compacted
   - `session.compacted` event fires when done
   - Affects message history retrieval

9. **No built-in rate limiting**
   - SDK doesn't throttle requests
   - Server may reject rapid requests
   - Implement client-side rate limiting

10. **Fetch implementation matters**
    - Custom fetch can be provided
    - Bun's fetch has `timeout: false` by default
    - SDK sets this in `createOpencodeClient()`

---

## Summary Table

| Component | Key Points |
|-----------|-----------|
| **Client Creation** | `createOpencodeClient(config)` - returns OpencodeClient with namespaced methods |
| **promptAsync()** | Non-blocking, returns 204, listen to SSE for completion |
| **Event Streaming** | SSE with auto-retry, filter events manually, use `onSseEvent` callback |
| **Session Management** | `create()` returns Session, `list()` returns Session[], both support directory context |
| **Server Spawning** | `createOpencodeServer()` spawns subprocess, waits for startup, returns {url, close()} |
| **Error Handling** | Typed errors (ProviderAuthError, ApiError, etc.), use responseStyle: "fields" or throwOnError |
| **Authentication** | Via OPENCODE_SERVER_PASSWORD env var or headers, supports OAuth/API key/WellKnown |
| **SSE Events** | `message.part.updated` for streaming, `session.idle` for completion, auto-reconnect |
| **Limitations** | No polling, manual event filtering, no server-side rate limiting, directory context required |

