# OpenCode SDK - Complete CLI Tool Example

This example shows how to build a standalone CLI tool using the OpenCode SDK's HTTP client mode.

## Complete Example: Code Review CLI

```typescript
// cli.ts
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

interface CliOptions {
    projectDir: string;
    filePath: string;
    agent?: string;
    model?: string;
}

async function reviewCode(options: CliOptions) {
    // 1. Start server
    console.log("🚀 Starting OpenCode server...");
    const server = await createOpencodeServer({
        hostname: "127.0.0.1",
        port: 4096,
        timeout: 10000,
    });
    console.log(`✅ Server running at ${server.url}`);

    try {
        // 2. Create client
        const client = createOpencodeClient({
            baseUrl: server.url,
        });

        // 3. Create session
        console.log("📝 Creating session...");
        const { data: session, error: createError } = await client.session.create({
            body: {
                title: `Code Review: ${options.filePath}`,
            },
            query: {
                directory: options.projectDir,
            },
        });

        if (createError || !session) {
            console.error("❌ Failed to create session:", createError);
            return;
        }

        console.log(`✅ Session created: ${session.id}`);

        // 4. Read file
        const filePath = resolve(options.projectDir, options.filePath);
        const fileContent = readFileSync(filePath, "utf-8");

        // 5. Send prompt
        console.log("📤 Sending code for review...");
        await client.session.promptAsync({
            path: { id: session.id },
            body: {
                agent: options.agent || "code-review",
                model: options.model ? {
                    providerID: "openai",
                    modelID: options.model,
                } : undefined,
                parts: [
                    {
                        type: "text",
                        text: `Please review this code for:\n- Security issues\n- Performance problems\n- Code style\n- Best practices\n\nFile: ${options.filePath}`,
                    },
                    {
                        type: "file",
                        mime: "text/plain",
                        filename: options.filePath,
                        url: `file://${filePath}`,
                    },
                ],
            },
        });

        // 6. Listen for events
        console.log("📡 Listening for response...\n");
        console.log("─".repeat(60));

        let isComplete = false;
        let fullResponse = "";

        const eventResult = await client.global.event({
            onSseEvent: (event) => {
                const { payload } = event.data;

                // Filter by session
                if (payload.properties?.sessionID !== session.id) {
                    return;
                }

                // Handle streaming text
                if (payload.type === "message.part.updated") {
                    const { part, delta } = payload.properties;

                    if (part.type === "text") {
                        process.stdout.write(delta || "");
                        fullResponse += delta || "";
                    }

                    if (part.type === "tool") {
                        console.log(`\n🔧 Tool: ${part.tool} (${part.state.status})`);
                    }
                }

                // Handle completion
                if (payload.type === "session.idle") {
                    isComplete = true;
                }

                // Handle errors
                if (payload.type === "session.error") {
                    console.error("\n❌ Error:", payload.properties.error);
                }

                // Handle metadata
                if (payload.type === "message.updated") {
                    const msg = payload.properties.info;
                    if (msg.role === "assistant" && msg.time.completed) {
                        console.log(`\n\n📊 Tokens: ${msg.tokens.input}/${msg.tokens.output}`);
                        console.log(`💰 Cost: $${msg.cost.toFixed(4)}`);
                    }
                }
            },

            onSseError: (error) => {
                console.error("\n⚠️ Stream error:", error);
            },

            sseMaxRetryAttempts: 5,
        });

        // 7. Wait for completion
        for await (const event of eventResult.stream) {
            if (isComplete) break;
        }

        console.log("\n" + "─".repeat(60));
        console.log("✅ Review complete!");

        // 8. Get session summary
        const { data: sessionData } = await client.session.get({
            path: { id: session.id },
        });

        if (sessionData?.summary) {
            console.log(`\n📈 Session Summary:`);
            console.log(`   Files changed: ${sessionData.summary.files}`);
            console.log(`   Additions: +${sessionData.summary.additions}`);
            console.log(`   Deletions: -${sessionData.summary.deletions}`);
        }

    } finally {
        // 9. Cleanup
        server.close();
        console.log("\n🛑 Server stopped");
    }
}

// CLI argument parsing
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: ts-node cli.ts <project-dir> <file-path> [--agent=name] [--model=gpt-4]");
    process.exit(1);
}

const options: CliOptions = {
    projectDir: args[0],
    filePath: args[1],
};

// Parse optional flags
for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith("--agent=")) {
        options.agent = args[i].substring(8);
    } else if (args[i].startsWith("--model=")) {
        options.model = args[i].substring(8);
    }
}

reviewCode(options).catch(console.error);
```

## Usage

```bash
# Review a file
ts-node cli.ts /path/to/project src/main.ts

# With specific agent
ts-node cli.ts /path/to/project src/main.ts --agent=code-review

# With specific model
ts-node cli.ts /path/to/project src/main.ts --model=gpt-4
```

## Advanced Example: Batch Processing

```typescript
// batch-review.ts
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import { glob } from "glob";
import { resolve } from "path";

async function batchReview(projectDir: string, pattern: string) {
    const server = await createOpencodeServer({
        hostname: "127.0.0.1",
        port: 4096,
    });

    const client = createOpencodeClient({
        baseUrl: server.url,
    });

    try {
        // Find files matching pattern
        const files = await glob(pattern, { cwd: projectDir });
        console.log(`Found ${files.length} files to review\n`);

        for (const file of files) {
            console.log(`📝 Reviewing ${file}...`);

            // Create session for each file
            const { data: session } = await client.session.create({
                body: { title: `Review: ${file}` },
                query: { directory: projectDir },
            });

            if (!session) continue;

            // Send for review
            await client.session.promptAsync({
                path: { id: session.id },
                body: {
                    parts: [
                        {
                            type: "text",
                            text: `Quick code review of ${file}`,
                        },
                        {
                            type: "file",
                            mime: "text/plain",
                            filename: file,
                            url: `file://${resolve(projectDir, file)}`,
                        },
                    ],
                },
            });

            // Collect results
            const results: string[] = [];

            await client.global.event({
                onSseEvent: (event) => {
                    const { payload } = event.data;

                    if (payload.properties?.sessionID !== session.id) return;

                    if (payload.type === "message.part.updated" &&
                        payload.properties.part.type === "text") {
                        results.push(payload.properties.delta || "");
                    }
                },
                sseMaxRetryAttempts: 3,
            });

            console.log(`✅ ${file}: ${results.join("").substring(0, 100)}...\n`);
        }

    } finally {
        server.close();
    }
}

batchReview(process.argv[2], process.argv[3] || "src/**/*.ts")
    .catch(console.error);
```

## Example: Interactive REPL

```typescript
// repl.ts
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import * as readline from "readline";

async function startRepl(projectDir: string) {
    const server = await createOpencodeServer();
    const client = createOpencodeClient({ baseUrl: server.url });

    const { data: session } = await client.session.create({
        body: { title: "Interactive Session" },
        query: { directory: projectDir },
    });

    if (!session) {
        console.error("Failed to create session");
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const prompt = () => {
        rl.question("\n> ", async (input) => {
            if (input === "exit") {
                rl.close();
                server.close();
                return;
            }

            // Send prompt
            await client.session.promptAsync({
                path: { id: session.id },
                body: {
                    parts: [{ type: "text", text: input }],
                },
            });

            // Stream response
            let done = false;
            await client.global.event({
                onSseEvent: (event) => {
                    const { payload } = event.data;

                    if (payload.properties?.sessionID !== session.id) return;

                    if (payload.type === "message.part.updated" &&
                        payload.properties.part.type === "text") {
                        process.stdout.write(payload.properties.delta || "");
                    }

                    if (payload.type === "session.idle") {
                        done = true;
                    }
                },
            });

            // Wait for completion
            while (!done) {
                await new Promise(r => setTimeout(r, 100));
            }

            prompt();
        });
    };

    console.log("🚀 OpenCode REPL (type 'exit' to quit)");
    prompt();
}

startRepl(process.argv[2] || process.cwd()).catch(console.error);
```

## Key Patterns

### 1. Session Management
```typescript
// Create
const { data: session } = await client.session.create({
    body: { title: "Task" },
    query: { directory: "/path" },
});

// List
const { data: sessions } = await client.session.list({
    query: { directory: "/path" },
});

// Get details
const { data: details } = await client.session.get({
    path: { id: session.id },
});

// Delete
await client.session.delete({
    path: { id: session.id },
});
```

### 2. Event Filtering
```typescript
await client.global.event({
    onSseEvent: (event) => {
        // Filter by directory
        if (event.data.directory !== "/my/project") return;

        const { payload } = event.data;

        // Filter by session
        if (payload.properties?.sessionID !== mySessionId) return;

        // Filter by event type
        if (payload.type === "message.part.updated") {
            // Handle
        }
    },
});
```

### 3. Error Recovery
```typescript
let retries = 0;
const maxRetries = 3;

while (retries < maxRetries) {
    try {
        const { data, error } = await client.session.create({
            body: { title: "Test" },
        });

        if (error) throw new Error(error.data?.message);
        return data;

    } catch (err) {
        retries++;
        if (retries >= maxRetries) throw err;
        await new Promise(r => setTimeout(r, 1000 * retries));
    }
}
```

### 4. Streaming with Progress
```typescript
let totalChars = 0;
let startTime = Date.now();

await client.global.event({
    onSseEvent: (event) => {
        if (event.data.payload.type === "message.part.updated") {
            const { delta } = event.data.payload.properties;
            if (delta) {
                totalChars += delta.length;
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = (totalChars / elapsed).toFixed(0);
                process.stdout.write(`\r[${totalChars} chars @ ${rate} chars/s]`);
            }
        }
    },
});
```

## Testing

```typescript
// test.ts
import { describe, it, expect } from "bun:test";
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";

describe("OpenCode CLI", () => {
    it("should create a session", async () => {
        const server = await createOpencodeServer();
        const client = createOpencodeClient({ baseUrl: server.url });

        const { data: session } = await client.session.create({
            body: { title: "Test" },
        });

        expect(session).toBeDefined();
        expect(session?.id).toBeTruthy();

        server.close();
    });

    it("should send prompt and receive events", async () => {
        const server = await createOpencodeServer();
        const client = createOpencodeClient({ baseUrl: server.url });

        const { data: session } = await client.session.create({
            body: { title: "Test" },
        });

        if (!session) throw new Error("No session");

        await client.session.promptAsync({
            path: { id: session.id },
            body: {
                parts: [{ type: "text", text: "Hello" }],
            },
        });

        let receivedEvent = false;

        await client.global.event({
            onSseEvent: (event) => {
                if (event.data.payload.type === "message.part.updated") {
                    receivedEvent = true;
                }
            },
            sseMaxRetryAttempts: 1,
        });

        expect(receivedEvent).toBe(true);

        server.close();
    });
});
```

Run with: `bun test`

