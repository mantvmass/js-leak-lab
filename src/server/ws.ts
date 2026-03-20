import { wsClients } from "./state";
import { getSnapshot } from "./snapshot";

export const websocketHandlers = {
    open(ws: any) {
        wsClients.add(ws);
        ws.send(JSON.stringify(getSnapshot()));
    },
    close(ws: any) {
        wsClients.delete(ws);
    },
    message() { },
};

export function startBroadcast(intervalMs = 500) {
    setInterval(() => {
        if (wsClients.size === 0) return;
        const data = JSON.stringify(getSnapshot());
        for (const ws of wsClients) {
            try { ws.send(data); } catch { wsClients.delete(ws); }
        }
    }, intervalMs);
}
