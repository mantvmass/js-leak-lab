let leakyMap = new Map<object, { meta: string; ts: number }>();

let fixedWeakMap = new WeakMap<object, { meta: string; ts: number }>();
let fixedCreated = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function makeObject() {
    return { id: Math.random(), payload: "w".repeat(500) };
}

export default {
    id: "10-weakmap-vs-map",
    label: "WeakMap vs Map",
    tag: "weakmap vs map",
    description: "ใช้ Map เก็บ metadata โดย key เป็น object instance เมื่อ object หลุด scope แล้ว Map ยังยึด reference ไว้ ทำให้ GC เก็บไม่ได้ WeakMap แก้ปัญหานี้",
    badCode: `const metadata = new Map();

function makeObject() {
    return { id: Math.random(), payload: "w".repeat(500) };
}

function trackElement(el) {
    metadata.set(el, {
        meta: "m".repeat(500),
        tracked: Date.now()
    });
}

setInterval(() => {
    for (let i = 0; i < 100; i++) {
        const el = makeObject();
        trackElement(el);
        // el หลุด scope แต่ Map ยัง retain key ไว้
        // GC เก็บ el ไม่ได้ — Map.size โตเรื่อยๆ
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("map size:", metadata.size, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const metadata = new WeakMap();

function makeObject() {
    return { id: Math.random(), payload: "w".repeat(500) };
}

function trackElement(el) {
    metadata.set(el, {
        meta: "m".repeat(500),
        tracked: Date.now()
    });
}

let created = 0;
setInterval(() => {
    for (let i = 0; i < 100; i++) {
        const el = makeObject();
        trackElement(el);
        created++;
        // el หลุด scope ตอนจบ loop
        // WeakMap ไม่ยึด key — GC เก็บ el + metadata ได้
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("created:", created, "heap:", mb.toFixed(1), "MB (stable)");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                const obj = makeObject();
                leakyMap.set(obj, { meta: "m".repeat(500), ts: Date.now() });
                // Map retains obj as key — even though obj has no other reference
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyMap.clear();
        leakyMap = new Map();
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedCreated = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                const obj = makeObject();
                fixedWeakMap.set(obj, { meta: "m".repeat(500), ts: Date.now() });
                fixedCreated++;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedWeakMap = new WeakMap();
        fixedCreated = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyMap.size, fixed: fixedCreated };
    },
};
