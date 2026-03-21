import { readFileSync } from "fs";
import { join } from "path";
import { leakModules, moduleMap } from "./modules";
import { runningStates } from "./state";

const srcDir = join(import.meta.dir, "..");

function serveFile(path: string, contentType: string): Response {
    try {
        const content = readFileSync(join(srcDir, path), "utf-8");
        return new Response(content, { headers: { "Content-Type": contentType } });
    } catch {
        return new Response("Not found", { status: 404 });
    }
}

export function handleRequest(req: Request): Response {
    const url = new URL(req.url);

    if (req.method === "GET") {
        if (url.pathname === "/" || url.pathname === "/index.html")
            return serveFile("index.html", "text/html; charset=utf-8");
        if (url.pathname.startsWith("/client/"))
            return serveFile(url.pathname.slice(1), "application/javascript; charset=utf-8");
        if (url.pathname === "/styles.css")
            return serveFile("styles.css", "text/css; charset=utf-8");
        if (url.pathname === "/language.json")
            return serveFile("language.json", "application/json; charset=utf-8");

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

            if (action === "start-leak") runningStates[id] = "leak";
            else if (action === "start-fix") runningStates[id] = "fix";
            else if (action === "stop-leak" || action === "stop-fix") runningStates[id] = null;

            return Response.json({ ok: true, id, action });
        }
    }

    return new Response("Not found", { status: 404 });
}
