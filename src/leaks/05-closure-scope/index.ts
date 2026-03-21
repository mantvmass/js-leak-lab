let leakyRefs: (() => number)[] = [];
const MAX_FIXED = 50;
let fixedRefs: { value: number }[] = [];
let fixedIdx = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function makeLargeArray() {
    return Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        data: "c".repeat(500),
    }));
}

export default {
    id: "05-closure-scope",
    label: "05-closure-scope-title",
    tag: "closure scope",
    description: "05-closure-scope-description",
    badCode: `function makeLargeArray() {
    return Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        data: "c".repeat(500),
    }));
}

function createProcessor() {
    const bigArray = makeLargeArray(); // ~2MB
    return function getTotal() {
        // closure จับ bigArray ทั้งตัว แม้ต้องการแค่ผลรวม
        return bigArray.reduce((s, o) => s + o.id, 0);
    };
}

const processors = [];
setInterval(() => {
    for (let i = 0; i < 10; i++) {
        processors.push(createProcessor());
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("closures:", processors.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `function makeLargeArray() {
    return Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        data: "c".repeat(500),
    }));
}

function createProcessor() {
    const bigArray = makeLargeArray();
    // extract เฉพาะค่าที่ต้องการ — bigArray หลุด scope ทันที
    const total = bigArray.reduce((s, o) => s + o.id, 0);
    return function getTotal() {
        return total; // จับแค่ตัวเลข ไม่จับ array
    };
}

const MAX_POOL = 50;
const processors = new Array(MAX_POOL);
let idx = 0;
setInterval(() => {
    for (let i = 0; i < 10; i++) {
        processors[idx] = createProcessor();
        idx = (idx + 1) % MAX_POOL;
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("pool:", MAX_POOL, "heap:", mb.toFixed(1), "MB (stable)");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 10; i++) {
                const bigArray = makeLargeArray();
                leakyRefs.push(() => bigArray.reduce((s, o) => s + o.id, 0));
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyRefs.length = 0;
        leakyRefs = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedRefs = new Array(MAX_FIXED);
        fixedIdx = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 10; i++) {
                const bigArray = makeLargeArray();
                const total = bigArray.reduce((s, o) => s + o.id, 0);
                fixedRefs[fixedIdx] = { value: total };
                fixedIdx = (fixedIdx + 1) % MAX_FIXED;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedRefs.length = 0;
        fixedRefs = [];
        fixedIdx = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyRefs.length, fixed: fixedRefs.filter(Boolean).length };
    },
};
