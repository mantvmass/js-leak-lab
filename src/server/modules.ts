import { readdirSync } from "fs";
import { join } from "path";

export interface LeakModule {
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

export const leakModules: LeakModule[] = [];
export const moduleMap = new Map<string, LeakModule>();

export async function loadModules() {
    const leaksDir = join(import.meta.dir, "..", "leaks");
    const dirs = readdirSync(leaksDir).sort();

    for (const dir of dirs) {
        try {
            const mod = await import(`../leaks/${dir}/index.ts`);
            if (mod.default) {
                leakModules.push(mod.default);
                moduleMap.set(mod.default.id, mod.default);
            } else {
                console.warn(`Module ${dir} has no default export, skipped`);
            }
        } catch (e) {
            console.error(`Failed to load module ${dir}:`, e);
        }
    }

    console.log(`Loaded ${leakModules.length} leak modules`);
}
