let leakyCallbacks: Map<string, (() => void)[]> = new Map();
let fixedCallbacks: Map<string, Map<string, () => void>> = new Map();

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;
let leakyTotal = 0;
let fixedTotal = 0;

function makeHandler() {
    const data = Array.from({ length: 100 }, () => "h".repeat(300));
    return () => { void data.length; };
}

export default {
    id: "13-callback-registry",
    label: "13-callback-registry-title",
    tag: "callback registry",
    description: "13-callback-registry-description",
    badCode: `const registry = new Map();

function subscribe(event, callback) {
    if (!registry.has(event)) registry.set(event, []);
    registry.get(event).push(callback);
    // push ทับไม่เคย unsubscribe
    // callback + closure สะสมถาวร
}

function emit(event) {
    const cbs = registry.get(event) || [];
    for (const cb of cbs) cb();
}

let total = 0;
setInterval(() => {
    for (let i = 0; i < 30; i++) {
        const data = Array.from({ length: 100 }, () => "h".repeat(300));
        subscribe("update", () => { void data.length; });
        total++;
    }
    emit("update");
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("callbacks:", total, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const registry = new Map();

function subscribe(event, key, callback) {
    if (!registry.has(event)) registry.set(event, new Map());
    registry.get(event).set(key, callback);
    // ใช้ key — callback เดิมถูก replace อัตโนมัติ
}

function unsubscribe(event, key) {
    registry.get(event)?.delete(key);
}

function emit(event) {
    const cbs = registry.get(event);
    if (cbs) for (const cb of cbs.values()) cb();
}

setInterval(() => {
    for (let i = 0; i < 30; i++) {
        const data = Array.from({ length: 100 }, () => "h".repeat(300));
        subscribe("update", "handler-" + (i % 10), () => {
            void data.length;
        });
        // key ซ้ำ — replace ตัวเก่า ไม่สะสม
    }
    emit("update");
    const size = registry.get("update")?.size || 0;
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("callbacks:", size, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakyTotal = 0;
        leakTimer = setInterval(() => {
            for (let i = 0; i < 30; i++) {
                const event = "leak-event";
                if (!leakyCallbacks.has(event)) leakyCallbacks.set(event, []);
                leakyCallbacks.get(event)!.push(makeHandler());
                leakyTotal++;
            }
            const cbs = leakyCallbacks.get("leak-event") || [];
            for (const cb of cbs) cb();
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyCallbacks.clear();
        leakyCallbacks = new Map();
        leakyTotal = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedTotal = 0;
        fixTimer = setInterval(() => {
            const event = "fix-event";
            if (!fixedCallbacks.has(event)) fixedCallbacks.set(event, new Map());
            const handlers = fixedCallbacks.get(event)!;
            for (let i = 0; i < 30; i++) {
                handlers.set("handler-" + (i % 10), makeHandler());
            }
            fixedTotal = handlers.size;
            for (const cb of handlers.values()) cb();
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedCallbacks.clear();
        fixedCallbacks = new Map();
        fixedTotal = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyTotal, fixed: fixedTotal };
    },
};
