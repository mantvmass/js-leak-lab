import { readdirSync, readFileSync } from "fs";
import { join } from "path";

interface LeakModule {
    id: string;
    label: string;
    tag: string;
    description: string;
    badCode: string;
    goodCode: string;
    startLeak(): void;
    stopLeak(): void;
    startFix(): void;
    stopFix(): void;
    getSize(): { leaky: number; fixed: number };
}

const leakModules: LeakModule[] = [];
const dirs = readdirSync(join(import.meta.dir, "leaks")).sort();
for (const dir of dirs) {
    try {
        const mod = await import(`./leaks/${dir}/index.ts`);
        if (mod.default) leakModules.push(mod.default);
        else console.warn(`Module ${dir} has no default export, skipped`);
    } catch (e) {
        console.error(`Failed to load module ${dir}:`, e);
    }
}
console.log(`Loaded ${leakModules.length} leak modules`);

const moduleMap = new Map(leakModules.map((m) => [m.id, m]));

// Track running state per module for cross-client sync
const runningStates: Record<string, null | "leak" | "fix"> = {};
for (const m of leakModules) {
    runningStates[m.id] = null;
}

interface Snapshot {
    ts: number;
    heapUsed: number;
}

const history: Snapshot[] = [];
const MAX_HISTORY = 120;

function getSnapshot() {
    const mem = process.memoryUsage();
    const now = Date.now();

    history.push({ ts: now, heapUsed: mem.heapUsed });
    if (history.length > MAX_HISTORY) history.shift();

    const leakSizes: Record<string, { leaky: number; fixed: number }> = {};
    for (const m of leakModules) {
        leakSizes[m.id] = m.getSize();
    }

    return {
        ts: now,
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        leakSizes,
        runningStates: { ...runningStates },
        history: [...history],
    };
}

function serveFile(path: string, contentType: string): Response {
    try {
        const content = readFileSync(join(import.meta.dir, path), "utf-8");
        return new Response(content, { headers: { "Content-Type": contentType } });
    } catch {
        return new Response("Not found", { status: 404 });
    }
}

const wsClients = new Set<any>();

const server = Bun.serve({
    port: 3000,
    fetch(req, server) {
        const url = new URL(req.url);

        if (server.upgrade(req)) return;

        try {
            if (req.method === "GET") {
                if (url.pathname === "/" || url.pathname === "/index.html")
                    return serveFile("index.html", "text/html; charset=utf-8");
                if (url.pathname === "/script.js")
                    return serveFile("script.js", "application/javascript; charset=utf-8");
                if (url.pathname === "/styles.css")
                    return serveFile("styles.css", "text/css; charset=utf-8");

                if (url.pathname === "/modules") {
                    const meta = leakModules.map((m) => ({
                        id: m.id,
                        label: m.label,
                        tag: m.tag,
                        description: m.description,
                        badCode: m.badCode,
                        goodCode: m.goodCode,
                    }));
                    return Response.json(meta);
                }
            }

            if (req.method === "POST") {
                const match = url.pathname.match(/^\/leak\/([^/]+)\/(start-leak|stop-leak|start-fix|stop-fix)$/);
                if (match) {
                    const id = match[1]!;
                    const action = match[2]!;
                    const mod = moduleMap.get(id);
                    if (!mod) return Response.json({ error: "Module not found" }, { status: 404 });

                    const methodMap: Record<string, "startLeak" | "stopLeak" | "startFix" | "stopFix"> = {
                        "start-leak": "startLeak",
                        "stop-leak": "stopLeak",
                        "start-fix": "startFix",
                        "stop-fix": "stopFix",
                    };
                    mod[methodMap[action]!]();

                    // Update running state for cross-client sync
                    if (action === "start-leak") runningStates[id] = "leak";
                    else if (action === "start-fix") runningStates[id] = "fix";
                    else if (action === "stop-leak" || action === "stop-fix") runningStates[id] = null;

                    return Response.json({ ok: true, id, action });
                }
            }

            return new Response("Not found", { status: 404 });
        } catch (e: any) {
            return Response.json({ error: e.message }, { status: 500 });
        }
    },
    websocket: {
        open(ws) {
            wsClients.add(ws);
            ws.send(JSON.stringify(getSnapshot()));
        },
        close(ws) {
            wsClients.delete(ws);
        },
        message() { },
    },
});

setInterval(() => {
    if (wsClients.size === 0) return;
    const data = JSON.stringify(getSnapshot());
    for (const ws of wsClients) {
        try { ws.send(data); } catch { wsClients.delete(ws); }
    }
}, 500);

console.log(`Server running at http://localhost:${server.port}`);
