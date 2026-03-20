let leakySnapshots: object[] = [];
let fixedCount = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function makeLargeState() {
    return {
        users: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: "user-" + i,
            data: "d".repeat(300),
        })),
        ts: Date.now(),
    };
}

export default {
    id: "17-console-log-objects",
    label: "Object Snapshot สะสม",
    tag: "snapshot retain",
    description: "เก็บ snapshot ของ state object ทั้งตัวไว้ใน array เพื่อ debug ทำให้ทุก snapshot + ข้อมูลภายในค้างใน heap ควร log เฉพาะ summary หรือจำกัดจำนวน",
    badCode: `const snapshots = [];

function makeLargeState() {
    return {
        users: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: "user-" + i,
            data: "d".repeat(300),
        })),
        ts: Date.now(),
    };
}

const state = makeLargeState();

setInterval(() => {
    for (let i = 0; i < 10; i++) {
        // เก็บ snapshot ทั้งตัวเพื่อ debug
        snapshots.push(JSON.parse(JSON.stringify(state)));
        state.ts = Date.now();
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("snapshots:", snapshots.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `function makeLargeState() {
    return {
        users: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: "user-" + i,
            data: "d".repeat(300),
        })),
        ts: Date.now(),
    };
}

const state = makeLargeState();
let debugCount = 0;

setInterval(() => {
    for (let i = 0; i < 10; i++) {
        // log แค่ summary — ไม่เก็บ full snapshot
        const summary = {
            userCount: state.users.length,
            ts: state.ts,
        };
        void summary;
        state.ts = Date.now();
        debugCount++;
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("processed:", debugCount, "heap:", mb.toFixed(1), "MB (stable)");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            const state = makeLargeState();
            for (let i = 0; i < 10; i++) {
                leakySnapshots.push(JSON.parse(JSON.stringify(state)));
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakySnapshots.length = 0;
        leakySnapshots = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedCount = 0;
        fixTimer = setInterval(() => {
            const state = makeLargeState();
            for (let i = 0; i < 10; i++) {
                const summary = { userCount: state.users.length, ts: state.ts };
                void summary;
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
        return { leaky: leakySnapshots.length, fixed: fixedCount };
    },
};
