let leakySet = new Set<string>();
const MAX_FIXED = 200;
let fixedSet = new Set<string>();

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

export default {
    id: "18-set-accumulation",
    label: "18-set-accumulation-title",
    tag: "set accumulation",
    description: "18-set-accumulation-description",
    badCode: `const seenIds = new Set();

function processEvent(event) {
    // deduplicate — แต่ไม่เคย evict
    if (seenIds.has(event.id)) return;
    seenIds.add(event.id);
    // process event...
}

let counter = 0;
setInterval(() => {
    for (let i = 0; i < 100; i++) {
        processEvent({
            id: "evt-" + counter++,
            payload: "p".repeat(200),
        });
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("set size:", seenIds.size, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const MAX_SIZE = 200;
const seenIds = new Set();

function processEvent(event) {
    if (seenIds.has(event.id)) return;
    seenIds.add(event.id);
    // evict เก่าสุดถ้าเกินขนาด
    if (seenIds.size > MAX_SIZE) {
        const first = seenIds.values().next().value;
        seenIds.delete(first);
    }
    // process event...
}

let counter = 0;
setInterval(() => {
    for (let i = 0; i < 100; i++) {
        processEvent({
            id: "evt-" + counter++,
            payload: "p".repeat(200),
        });
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("set size:", seenIds.size, "heap:", mb.toFixed(1), "MB (stable)");
}, 200);`,

    startLeak() {
        this.stopLeak();
        let counter = 0;
        leakTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                leakySet.add("evt-" + counter++ + "-" + Date.now());
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakySet.clear();
        leakySet = new Set();
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedSet = new Set();
        let counter = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                fixedSet.add("evt-" + counter++);
                if (fixedSet.size > MAX_FIXED) {
                    const first = fixedSet.values().next().value;
                    if (first !== undefined) fixedSet.delete(first);
                }
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedSet.clear();
        fixedSet = new Set();
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakySet.size, fixed: fixedSet.size };
    },
};
