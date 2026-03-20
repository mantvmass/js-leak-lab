import { leakModules } from "./modules";
import { runningStates } from "./state";

interface HistoryPoint {
    ts: number;
    heapUsed: number;
}

const history: HistoryPoint[] = [];
const MAX_HISTORY = 120;

export function getSnapshot() {
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
