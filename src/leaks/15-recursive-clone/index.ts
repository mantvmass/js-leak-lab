let leakyClones: any[] = [];
let fixedCount = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function makeDeepObject() {
    return {
        user: { name: "test", prefs: { theme: "dark", lang: "th" } },
        payload: "d".repeat(500),
        items: Array.from({ length: 50 }, (_, i) => ({
            id: i,
            value: "v".repeat(200),
        })),
    };
}

function deepClone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
}

export default {
    id: "15-recursive-clone",
    label: "15-recursive-clone-title",
    tag: "recursive clone",
    description: "15-recursive-clone-description",
    badCode: `const snapshots = [];

function makeState() {
    return {
        user: { name: "test", prefs: { theme: "dark" } },
        payload: "d".repeat(500),
        items: Array.from({ length: 50 }, (_, i) => ({
            id: i, value: "v".repeat(200)
        })),
    };
}

const state = makeState();
setInterval(() => {
    for (let i = 0; i < 10; i++) {
        // deep clone ทุกรอบ + เก็บสะสม
        const snapshot = JSON.parse(JSON.stringify(state));
        snapshots.push(snapshot);
        state.payload = "d".repeat(500); // mutate
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("snapshots:", snapshots.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `function makeState() {
    return {
        user: { name: "test", prefs: { theme: "dark" } },
        payload: "d".repeat(500),
        items: Array.from({ length: 50 }, (_, i) => ({
            id: i, value: "v".repeat(200)
        })),
    };
}

const state = makeState();
let lastSnapshot = null;
let processed = 0;

setInterval(() => {
    for (let i = 0; i < 10; i++) {
        // clone เฉพาะส่วนที่ต้องการ + เก็บแค่ตัวล่าสุด
        lastSnapshot = {
            userName: state.user.name,
            itemCount: state.items.length,
            ts: Date.now()
        };
        state.payload = "d".repeat(500);
        processed++;
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("processed:", processed, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 10; i++) {
                leakyClones.push(deepClone(makeDeepObject()));
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyClones.length = 0;
        leakyClones = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedCount = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 10; i++) {
                const obj = makeDeepObject();
                const summary = { name: obj.user.name, count: obj.items.length, ts: Date.now() };
                void summary.count;
                fixedCount++;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyClones.length, fixed: fixedCount };
    },
};
