import { loadModules } from "./modules";
import { initRunningStates } from "./state";
import { leakModules } from "./modules";
import { handleRequest } from "./routes";
import { websocketHandlers, startBroadcast } from "./ws";

await loadModules();
initRunningStates(leakModules);

const server = Bun.serve({
    port: 3000,
    fetch(req, server) {
        if (server.upgrade(req)) return;
        try {
            return handleRequest(req);
        } catch (e: any) {
            return Response.json({ error: e.message }, { status: 500 });
        }
    },
    websocket: websocketHandlers,
});

startBroadcast(500);

console.log(`Server running at http://localhost:${server.port}`);
