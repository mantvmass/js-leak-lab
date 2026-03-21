let leakyPatterns: RegExp[] = [];
const MAX_FIXED = 50;
let fixedPatterns: RegExp[] = [];
let fixedIdx = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

export default {
    id: "16-regexp-cache",
    label: "16-regexp-cache-title",
    tag: "regexp cache",
    description: "16-regexp-cache-description",
    badCode: `const patterns = [];

function validateInput(input, rule) {
    // สร้าง RegExp ใหม่ทุกครั้ง + เก็บสะสม
    const re = new RegExp(rule, "gi");
    patterns.push(re);
    return re.test(input);
}

const rules = [
    "^[a-z]+$", "\\\\d{3,}", "[A-Z].*[0-9]",
    "^\\\\w+@\\\\w+\\\\.\\\\w+$", "^https?://",
];

setInterval(() => {
    for (let i = 0; i < 200; i++) {
        const rule = rules[i % rules.length];
        validateInput("test-input-" + i, rule);
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("patterns:", patterns.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const patternCache = new Map();
const MAX_CACHE = 50;

function validateInput(input, rule) {
    let re = patternCache.get(rule);
    if (!re) {
        re = new RegExp(rule, "gi");
        patternCache.set(rule, re);
        // evict ถ้าเกินขนาด
        if (patternCache.size > MAX_CACHE) {
            const first = patternCache.keys().next().value;
            patternCache.delete(first);
        }
    }
    re.lastIndex = 0; // reset สำหรับ global flag
    return re.test(input);
}

const rules = [
    "^[a-z]+$", "\\\\d{3,}", "[A-Z].*[0-9]",
    "^\\\\w+@\\\\w+\\\\.\\\\w+$", "^https?://",
];

setInterval(() => {
    for (let i = 0; i < 200; i++) {
        const rule = rules[i % rules.length];
        validateInput("test-input-" + i, rule);
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("cache size:", patternCache.size, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 200; i++) {
                leakyPatterns.push(new RegExp(`pattern-${Date.now()}-${i}`, "gi"));
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyPatterns.length = 0;
        leakyPatterns = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedPatterns = new Array(MAX_FIXED);
        fixedIdx = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 200; i++) {
                fixedPatterns[fixedIdx] = new RegExp(`pattern-${i}`, "gi");
                fixedIdx = (fixedIdx + 1) % MAX_FIXED;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedPatterns.length = 0;
        fixedPatterns = [];
        fixedIdx = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyPatterns.length, fixed: fixedPatterns.filter(Boolean).length };
    },
};
