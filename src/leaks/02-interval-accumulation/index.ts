let leakyIntervals: ReturnType<typeof setInterval>[] = [];

let fixedInterval: ReturnType<typeof setInterval> | null = null;
let fixedCount = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;

function heavyWork() {
    return Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        payload: "d".repeat(500),
    }));
}

export default {
    id: "02-interval-accumulation",
    label: "02-interval-accumulation-title",
    tag: "interval accumulation",
    description: "02-interval-accumulation-description",
    badCode: `// สังเกตว่า interval count เพิ่มขึ้นเรื่อย ๆ

function startPolling() {
    setInterval(() => {
        const data = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            payload: "d".repeat(500),
        }));
        void data.length;
    }, 100);
    // ไม่เก็บ ref — ไม่สามารถ clear ได้
}

// simulate component remount ทุก 500ms
let mountCount = 0;
setInterval(() => {
    startPolling();
    mountCount++;
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("active intervals:", mountCount, "heap:", mb.toFixed(1), "MB");
}, 500);`,
    goodCode: `// สังเกตว่า interval count คงที่ที่ 1

let pollRef = null;

function startPolling() {
    if (pollRef) clearInterval(pollRef);
    pollRef = setInterval(() => {
        const data = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            payload: "d".repeat(500),
        }));
        void data.length;
    }, 100);
}

function stopPolling() {
    if (pollRef) {
        clearInterval(pollRef);
        pollRef = null;
    }
}

// simulate component remount ทุก 500ms
setInterval(() => {
    startPolling(); // clear ตัวเก่าก่อนสร้างใหม่
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("active intervals: 1", "heap:", mb.toFixed(1), "MB");
}, 500);

// cleanup เมื่อจบ
// stopPolling();`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            const id = setInterval(() => { heavyWork(); }, 100);
            leakyIntervals.push(id);
        }, 500);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        for (const id of leakyIntervals) clearInterval(id);
        leakyIntervals.length = 0;
        leakyIntervals = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedCount = 0;
        fixedInterval = setInterval(() => { heavyWork(); fixedCount++; }, 100);
    },

    stopFix() {
        if (fixedInterval) { clearInterval(fixedInterval); fixedInterval = null; }
        fixedCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyIntervals.length, fixed: fixedInterval ? 1 : 0 };
    },
};
