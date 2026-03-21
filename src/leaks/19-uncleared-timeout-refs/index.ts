let leakyTimeouts: ReturnType<typeof setTimeout>[] = [];
let fixedActive: ReturnType<typeof setTimeout> | null = null;
let fixedCount = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

export default {
    id: "19-uncleared-timeout-refs",
    label: "19-uncleared-timeout-refs-title",
    tag: "uncleared timeout",
    description: "19-uncleared-timeout-refs-description",
    badCode: `const pendingTimers = [];

function scheduleWork(data) {
    const timer = setTimeout(() => {
        // work with data...
        void data;
    }, 60000); // 1 นาที
    pendingTimers.push(timer);
    // ไม่เคย clearTimeout — timer + closure ค้าง
}

setInterval(() => {
    for (let i = 0; i < 50; i++) {
        scheduleWork({
            id: i,
            payload: "t".repeat(500),
            ts: Date.now(),
        });
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("pending:", pendingTimers.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `let activeTimer = null;

function scheduleWork(data) {
    // clear timer ก่อนหน้า
    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = setTimeout(() => {
        // work with data...
        void data;
        activeTimer = null;
    }, 60000);
}

let processed = 0;
setInterval(() => {
    for (let i = 0; i < 50; i++) {
        scheduleWork({
            id: i,
            payload: "t".repeat(500),
            ts: Date.now(),
        });
        processed++;
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("processed:", processed, "heap:", mb.toFixed(1), "MB (stable)");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 50; i++) {
                const data = { id: i, payload: "t".repeat(500), ts: Date.now() };
                const t = setTimeout(() => { void data; }, 60000);
                leakyTimeouts.push(t);
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        for (const t of leakyTimeouts) clearTimeout(t);
        leakyTimeouts.length = 0;
        leakyTimeouts = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedCount = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 50; i++) {
                const data = { id: i, payload: "t".repeat(500), ts: Date.now() };
                if (fixedActive) clearTimeout(fixedActive);
                fixedActive = setTimeout(() => {
                    void data;
                    fixedActive = null;
                }, 60000);
                fixedCount++;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        if (fixedActive) { clearTimeout(fixedActive); fixedActive = null; }
        fixedCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyTimeouts.length, fixed: fixedCount };
    },
};
