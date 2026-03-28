# OpenCode SDK HTTP Client Research - Complete Index

## 📚 Research Package Contents

This comprehensive research package contains **4 documents** totaling **54KB** of detailed information about the OpenCode SDK's HTTP client mode.

### Document Overview

| Document | Size | Purpose | Audience |
|----------|------|---------|----------|
| **RESEARCH_SUMMARY.md** | 8.8KB | Quick overview & navigation | Everyone (start here) |
| **OPENCODE_SDK_QUICK_REFERENCE.md** | 8.1KB | Practical patterns & examples | Developers building CLI tools |
| **OPENCODE_SDK_RESEARCH.md** | 23KB | Complete API reference | Deep dive / reference |
| **OPENCODE_CLI_EXAMPLE.md** | 14KB | Full working examples | Copy-paste ready code |

---

## 🎯 Quick Navigation

### I want to...

**Build a CLI tool quickly**
→ Read: OPENCODE_SDK_QUICK_REFERENCE.md
- Setup in 5 minutes
- Copy-paste patterns
- Common use cases

**Understand the full API**
→ Read: OPENCODE_SDK_RESEARCH.md
- All 40+ methods documented
- All 30+ event types
- All error types
- Limitations & gotchas

**See working code**
→ Read: OPENCODE_CLI_EXAMPLE.md
- Code review CLI (complete)
- Batch processing (complete)
- Interactive REPL (complete)
- Testing patterns

**Get oriented quickly**
→ Read: RESEARCH_SUMMARY.md
- Key findings
- Architecture overview
- Critical gotchas
- Verification checklist

---

## 📖 Document Summaries

### 1. RESEARCH_SUMMARY.md
**Purpose**: Quick reference and navigation guide

**Contains**:
- 📋 Document overview
- 🎯 Key findings (8 sections)
- 🏗️ Architecture diagram
- 💡 Workflow pattern
- ⚠️ Critical gotchas (8 items)
- 🚀 Quick start code
- 📚 Navigation guide
- ✅ Verification checklist

**Best for**: Getting oriented, finding what you need

---

### 2. OPENCODE_SDK_QUICK_REFERENCE.md
**Purpose**: Practical guide for building CLI tools

**Contains**:
- Setup instructions (2 options)
- Core workflow (6 steps)
- Common patterns:
  - Text prompts
  - File references
  - Model specification
  - Agent selection
  - Session forking
  - Message retrieval
  - Diff retrieval
- Event handling (5 event types)
- Error handling (3 patterns)
- Tips & tricks (5 advanced patterns)
- Gotchas (5 critical items)
- API reference table (13 methods)
- Environment variables

**Best for**: Implementation, copy-paste patterns

---

### 3. OPENCODE_SDK_RESEARCH.md
**Purpose**: Complete technical reference

**Sections**:
1. `createOpencodeClient()` - Full API surface
2. `client.session.promptAsync()` - Parameters & response
3. `client.event.subscribe()` - SSE streaming
4. `client.session.create()` & `list()` - Session management
5. `createOpencodeServer()` - Server spawning
6. Error handling - All exception types
7. Authentication - OPENCODE_SERVER_PASSWORD
8. SSE event format - All event types
9. Limitations & gotchas - 10 detailed items

**Best for**: Deep understanding, reference lookup

---

### 4. OPENCODE_CLI_EXAMPLE.md
**Purpose**: Working code examples

**Examples**:
1. **Code Review CLI** (complete, 150+ lines)
   - Server startup
   - Session creation
   - File reading
   - Prompt sending
   - Event listening
   - Response streaming
   - Session summary

2. **Batch Processing** (complete, 60+ lines)
   - File globbing
   - Multiple sessions
   - Parallel processing
   - Result collection

3. **Interactive REPL** (complete, 70+ lines)
   - Readline interface
   - Session persistence
   - Streaming responses
   - Exit handling

4. **Key Patterns** (5 patterns)
   - Session management
   - Event filtering
   - Error recovery
   - Streaming with progress

5. **Testing** (Bun test examples)
   - Session creation test
   - Event handling test

**Best for**: Copy-paste, learning by example

---

## 🔑 Key Information at a Glance

### Client Creation
```typescript
const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
});
```

### Server Spawning
```typescript
const server = await createOpencodeServer({
    hostname: "127.0.0.1",
    port: 4096,
});
```

### Sending Prompts
```typescript
await client.session.promptAsync({
    path: { id: sessionId },
    body: { parts: [{ type: "text", text: "..." }] },
});
```

### Listening for Events
```typescript
await client.global.event({
    onSseEvent: (event) => {
        // Handle event.data.payload
    },
});
```

---

## 📊 Research Statistics

| Metric | Count |
|--------|-------|
| Total documents | 4 |
| Total lines | 1,200+ |
| Total size | 54KB |
| API methods documented | 40+ |
| Event types documented | 30+ |
| Error types documented | 7 |
| Code examples | 15+ |
| Gotchas identified | 10 |
| Patterns documented | 20+ |

---

## ✅ What's Covered

### API Methods
- ✅ `createOpencodeClient()`
- ✅ `createOpencodeServer()`
- ✅ `client.session.*` (15 methods)
- ✅ `client.project.*` (2 methods)
- ✅ `client.pty.*` (6 methods)
- ✅ `client.config.*` (3 methods)
- ✅ `client.tool.*` (2 methods)
- ✅ `client.provider.*` (3 methods)
- ✅ `client.find.*` (3 methods)
- ✅ `client.file.*` (3 methods)
- ✅ `client.app.*` (2 methods)
- ✅ `client.mcp.*` (5 methods)
- ✅ `client.command.*` (1 method)
- ✅ `client.instance.*` (1 method)
- ✅ `client.path.*` (1 method)
- ✅ `client.vcs.*` (1 method)
- ✅ `client.global.event()`

### Event Types
- ✅ `message.part.updated`
- ✅ `session.idle`
- ✅ `session.status`
- ✅ `session.error`
- ✅ `message.updated`
- ✅ `message.removed`
- ✅ `session.created`
- ✅ `session.updated`
- ✅ `session.deleted`
- ✅ `session.compacted`
- ✅ `session.diff`
- ✅ `todo.updated`
- ✅ `file.edited`
- ✅ `file.watcher.updated`
- ✅ `vcs.branch.updated`
- ✅ `pty.*` (4 events)
- ✅ `tui.*` (4 events)
- ✅ `permission.*` (2 events)
- ✅ `lsp.*` (2 events)
- ✅ `installation.*` (2 events)
- ✅ `server.connected`
- ✅ `server.instance.disposed`
- ✅ `command.executed`

### Error Types
- ✅ `ProviderAuthError`
- ✅ `ApiError`
- ✅ `MessageAbortedError`
- ✅ `MessageOutputLengthError`
- ✅ `UnknownError`
- ✅ `BadRequestError`
- ✅ `NotFoundError`

### Features
- ✅ Non-blocking prompts
- ✅ SSE event streaming
- ✅ Auto-reconnection
- ✅ Session management
- ✅ Server spawning
- ✅ Error handling
- ✅ Authentication
- ✅ File operations
- ✅ Tool execution
- ✅ Agent selection
- ✅ Model specification

---

## 🚀 Getting Started

### Step 1: Read RESEARCH_SUMMARY.md
Get oriented with key findings and architecture (5 min read)

### Step 2: Read OPENCODE_SDK_QUICK_REFERENCE.md
Learn the patterns you'll use (10 min read)

### Step 3: Check OPENCODE_CLI_EXAMPLE.md
See working code (15 min read)

### Step 4: Reference OPENCODE_SDK_RESEARCH.md
Look up specific details as needed (reference)

---

## 💾 File Locations

All files are in the project root:

```
/Users/cthua/Documents/InterestThing/opencode-discord-channel/
├── OPENCODE_RESEARCH_INDEX.md          ← You are here
├── RESEARCH_SUMMARY.md                 ← Start here
├── OPENCODE_SDK_QUICK_REFERENCE.md     ← For implementation
├── OPENCODE_SDK_RESEARCH.md            ← For deep dive
└── OPENCODE_CLI_EXAMPLE.md             ← For examples
```

---

## 🔗 Cross-References

### From RESEARCH_SUMMARY.md
- See OPENCODE_SDK_QUICK_REFERENCE.md for implementation
- See OPENCODE_SDK_RESEARCH.md for complete API
- See OPENCODE_CLI_EXAMPLE.md for working code

### From OPENCODE_SDK_QUICK_REFERENCE.md
- See OPENCODE_SDK_RESEARCH.md for detailed type definitions
- See OPENCODE_CLI_EXAMPLE.md for complete examples
- See RESEARCH_SUMMARY.md for gotchas

### From OPENCODE_SDK_RESEARCH.md
- See OPENCODE_SDK_QUICK_REFERENCE.md for patterns
- See OPENCODE_CLI_EXAMPLE.md for usage examples
- See RESEARCH_SUMMARY.md for quick overview

### From OPENCODE_CLI_EXAMPLE.md
- See OPENCODE_SDK_QUICK_REFERENCE.md for pattern reference
- See OPENCODE_SDK_RESEARCH.md for type details
- See RESEARCH_SUMMARY.md for architecture

---

## 📝 Notes

- All code examples are TypeScript
- All examples use the latest SDK (v1.3.3)
- All examples are production-ready
- All types are fully documented
- All gotchas are explained with solutions

---

## ✨ Highlights

### Most Important Concepts
1. **Non-blocking prompts** - `promptAsync()` returns 204 No Content
2. **SSE events** - Must listen for completion, no polling
3. **Event filtering** - Global events need manual filtering
4. **Directory context** - Critical for multi-project scenarios
5. **Auto-reconnect** - Exponential backoff (3s → 30s)

### Most Common Patterns
1. Create session → Send prompt → Listen for events
2. Filter events by directory and session ID
3. Handle `message.part.updated` for streaming
4. Handle `session.idle` for completion
5. Implement error recovery with retries

### Most Critical Gotchas
1. No response body from `promptAsync()`
2. Global events need filtering
3. No polling mechanism
4. Tool execution is async
5. Message parts are immutable

---

## 🎓 Learning Path

**Beginner** (30 minutes)
1. RESEARCH_SUMMARY.md (5 min)
2. OPENCODE_SDK_QUICK_REFERENCE.md (10 min)
3. OPENCODE_CLI_EXAMPLE.md - Code Review CLI (15 min)

**Intermediate** (1 hour)
1. All of Beginner path
2. OPENCODE_SDK_RESEARCH.md - Sections 1-5 (20 min)
3. OPENCODE_CLI_EXAMPLE.md - All examples (10 min)

**Advanced** (2 hours)
1. All of Intermediate path
2. OPENCODE_SDK_RESEARCH.md - All sections (30 min)
3. OPENCODE_CLI_EXAMPLE.md - Patterns & testing (10 min)
4. Build your own CLI tool (30 min)

---

## 📞 Quick Reference

### Most Used Methods
```typescript
client.session.create()
client.session.promptAsync()
client.session.list()
client.session.get()
client.global.event()
```

### Most Used Events
```typescript
message.part.updated
session.idle
session.status
session.error
message.updated
```

### Most Used Patterns
```typescript
// Create session
const { data: session } = await client.session.create({...})

// Send prompt
await client.session.promptAsync({...})

// Listen for events
await client.global.event({
    onSseEvent: (event) => {...}
})
```

---

**Research Date**: March 29, 2026  
**SDK Version**: 1.3.3  
**Status**: ✅ Complete & Verified

