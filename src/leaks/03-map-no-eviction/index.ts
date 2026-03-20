let leakyCache = new Map<string, { data: string; ts: number }>();

class TTLCache {
    private map = new Map<string, { data: string; ts: number }>();
    constructor(private ttlMs: number, private maxSize: number) {}

    set(key: string, data: string) {
        if (this.map.size >= this.maxSize) {
            const oldest = this.map.keys().next().value!;
            this.map.delete(oldest);
        }
        this.map.set(key, { data, ts: Date.now() });
    }

    get(key: string) {
        const entry = this.map.get(key);
        if (!entry) return undefined;
        if (Date.now() - entry.ts > this.ttlMs) {
            this.map.delete(key);
            return undefined;
        }
        return entry.data;
    }

    get size() { return this.map.size; }
    clear() { this.map.clear(); }
}

let fixedCache = new TTLCache(5000, 200);

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function randomKey() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default {
    id: "03-map-no-eviction",
    label: "Map ไม่มี eviction",
    tag: "map no eviction",
    description: "ใช้ Map เป็น session cache แต่ไม่เคย delete key เก่า ทำให้ Map โตตามจำนวน session ที่เคยเชื่อมต่อ",
    badCode: `const sessions = new Map();

function onConnect(sessionId) {
    sessions.set(sessionId, {
        user: { name: "user-" + sessionId },
        connectedAt: Date.now(),
        preferences: "x".repeat(600)
    });
    // ไม่มี eviction — disconnect แล้วก็ไม่ลบ
}

function randomId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

setInterval(() => {
    for (let i = 0; i < 100; i++) {
        onConnect(randomId());
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("sessions:", sessions.size, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `class TTLCache {
    constructor(ttlMs, maxSize) {
        this.map = new Map();
        this.ttlMs = ttlMs;
        this.maxSize = maxSize;
    }
    set(key, value) {
        if (this.map.size >= this.maxSize) {
            const oldest = this.map.keys().next().value;
            this.map.delete(oldest);
        }
        this.map.set(key, { value, ts: Date.now() });
    }
    get(key) {
        const entry = this.map.get(key);
        if (!entry) return undefined;
        if (Date.now() - entry.ts > this.ttlMs) {
            this.map.delete(key);
            return undefined;
        }
        return entry.value;
    }
    get size() { return this.map.size; }
}

const sessions = new TTLCache(5000, 200);

function randomId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

setInterval(() => {
    for (let i = 0; i < 100; i++) {
        sessions.set(randomId(), { preferences: "x".repeat(600) });
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("sessions:", sessions.size, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                leakyCache.set(randomKey(), { data: "s".repeat(600), ts: Date.now() });
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyCache.clear();
        leakyCache = new Map();
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                fixedCache.set(randomKey(), "s".repeat(600));
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedCache.clear();
        fixedCache = new TTLCache(5000, 200);
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyCache.size, fixed: fixedCache.size };
    },
};
