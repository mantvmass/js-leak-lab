let leakyParsed: object[] = [];
const MAX_FIXED = 50;
let fixedParsed: object[] = [];
let fixedIdx = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function makeJsonPayload() {
    return JSON.stringify({
        records: Array.from({ length: 50 }, (_, i) => ({
            id: i,
            name: "record-" + i,
            value: "v".repeat(300),
        })),
        meta: { source: "api", ts: Date.now() },
    });
}

export default {
    id: "20-json-parse-retain",
    label: "20-json-parse-retain-title",
    tag: "json parse retain",
    description: "20-json-parse-retain-description",
    badCode: `const results = [];

function processPayload(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    results.push(parsed);
    // เก็บ parsed object ทั้งตัว — สะสมไม่มีที่สิ้นสุด
    return parsed.records.length;
}

setInterval(() => {
    for (let i = 0; i < 10; i++) {
        const payload = JSON.stringify({
            records: Array.from({ length: 50 }, (_, j) => ({
                id: j,
                name: "record-" + j,
                value: "v".repeat(300),
            })),
            meta: { source: "api", ts: Date.now() },
        });
        processPayload(payload);
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("results:", results.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `function processPayload(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    // extract เฉพาะที่ต้องการ — parsed object หลุด scope
    const summary = {
        count: parsed.records.length,
        source: parsed.meta.source,
        ts: parsed.meta.ts,
    };
    return summary;
}

let processed = 0;
setInterval(() => {
    for (let i = 0; i < 10; i++) {
        const payload = JSON.stringify({
            records: Array.from({ length: 50 }, (_, j) => ({
                id: j,
                name: "record-" + j,
                value: "v".repeat(300),
            })),
            meta: { source: "api", ts: Date.now() },
        });
        processPayload(payload);
        processed++;
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("processed:", processed, "heap:", mb.toFixed(1), "MB (stable)");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 10; i++) {
                leakyParsed.push(JSON.parse(makeJsonPayload()));
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyParsed.length = 0;
        leakyParsed = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedParsed = new Array(MAX_FIXED);
        fixedIdx = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 10; i++) {
                const parsed = JSON.parse(makeJsonPayload());
                fixedParsed[fixedIdx] = {
                    count: parsed.records.length,
                    source: parsed.meta.source,
                    ts: parsed.meta.ts,
                };
                fixedIdx = (fixedIdx + 1) % MAX_FIXED;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedParsed.length = 0;
        fixedParsed = [];
        fixedIdx = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyParsed.length, fixed: fixedParsed.filter(Boolean).length };
    },
};
