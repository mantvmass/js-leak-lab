let leakyRegistry: Record<string, { data: string; ts: number }> = {};
let leakyKeyCount = 0;

let fixTimer: ReturnType<typeof setInterval> | null = null;
let leakTimer: ReturnType<typeof setInterval> | null = null;

const MAX_FIXED_ENTRIES = 200;

let fixedRegistry = new Map<string, { data: string; ts: number }>();

function randomId() {
    return Math.random().toString(36).slice(2, 14);
}

export default {
    id: "09-global-variable",
    label: "09-global-variable-title",
    tag: "global variable",
    description: "09-global-variable-description",
    badCode: `const registry = {};

function randomId() {
    return Math.random().toString(36).slice(2, 14);
}

function onEvent(eventId) {
    registry[eventId] = {
        data: "g".repeat(600),
        ts: Date.now()
    };
    // key ใหม่ทุก event — ไม่เคยลบ
}

let count = 0;
setInterval(() => {
    for (let i = 0; i < 100; i++) {
        onEvent(randomId());
        count++;
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("keys:", count, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const MAX_ENTRIES = 200;
const registry = new Map();

function randomId() {
    return Math.random().toString(36).slice(2, 14);
}

function onEvent(eventId) {
    if (registry.size >= MAX_ENTRIES) {
        // evict oldest entry
        const oldest = registry.keys().next().value;
        registry.delete(oldest);
    }
    registry.set(eventId, {
        data: "g".repeat(600),
        ts: Date.now()
    });
}

setInterval(() => {
    for (let i = 0; i < 100; i++) {
        onEvent(randomId());
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("keys:", registry.size, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakyKeyCount = 0;
        leakTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                leakyRegistry[randomId()] = { data: "g".repeat(600), ts: Date.now() };
                leakyKeyCount++;
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyRegistry = {};
        leakyKeyCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                if (fixedRegistry.size >= MAX_FIXED_ENTRIES) {
                    const oldest = fixedRegistry.keys().next().value!;
                    fixedRegistry.delete(oldest);
                }
                fixedRegistry.set(randomId(), { data: "g".repeat(600), ts: Date.now() });
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedRegistry.clear();
        fixedRegistry = new Map();
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyKeyCount, fixed: fixedRegistry.size };
    },
};
