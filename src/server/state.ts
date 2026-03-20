import type { LeakModule } from "./modules";

export const wsClients = new Set<any>();

// Track running state per module for cross-client sync
export const runningStates: Record<string, null | "leak" | "fix"> = {};

export function initRunningStates(modules: LeakModule[]) {
    for (const m of modules) {
        runningStates[m.id] = null;
    }
}
