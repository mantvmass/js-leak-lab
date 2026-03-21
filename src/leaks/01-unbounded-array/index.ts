const ENTRY_SIZE = 2048;
const MAX_FIXED = 200;

let leakyLog: { ts: number; data: string }[] = [];
let fixedLog: { ts: number; data: string }[] = [];
let fixedPtr = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function makeEntry() {
    return { ts: Date.now(), data: "x".repeat(ENTRY_SIZE) };
}

export default {
    id: "01-unbounded-array",
    label: "01-unbounded-array-title",
    tag: "unbounded array",
    description: "01-unbounded-array-description",
    badCode: `const http = require("http");

const requestLog = [];

const server = http.createServer((req, res) => {
    requestLog.push({
        ts: Date.now(),
        method: req.method,
        url: req.url,
        headers: JSON.stringify(req.headers),
        body: "x".repeat(2048)
    });
    // requestLog grows forever — no cap, no cleanup
    res.end("logged");
});

server.listen(4000);

// simulate traffic
setInterval(() => {
    for (let i = 0; i < 50; i++) {
        requestLog.push({ ts: Date.now(), data: "x".repeat(2048) });
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("entries:", requestLog.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const http = require("http");

const MAX_LOG = 200;
const requestLog = new Array(MAX_LOG);
let ptr = 0;

const server = http.createServer((req, res) => {
    requestLog[ptr] = {
        ts: Date.now(),
        method: req.method,
        url: req.url,
        headers: JSON.stringify(req.headers),
        body: "x".repeat(2048)
    };
    ptr = (ptr + 1) % MAX_LOG;
    // circular buffer — old entries overwritten, memory stays flat
    res.end("logged");
});

server.listen(4000);

// simulate traffic
const buf = new Array(MAX_LOG);
let p = 0;
setInterval(() => {
    for (let i = 0; i < 50; i++) {
        buf[p] = { ts: Date.now(), data: "x".repeat(2048) };
        p = (p + 1) % MAX_LOG;
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("buffer size:", MAX_LOG, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 50; i++) leakyLog.push(makeEntry());
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyLog.length = 0;
        leakyLog = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedLog = new Array(MAX_FIXED);
        fixedPtr = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 50; i++) {
                fixedLog[fixedPtr] = makeEntry();
                fixedPtr = (fixedPtr + 1) % MAX_FIXED;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedLog.length = 0;
        fixedLog = [];
        fixedPtr = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyLog.length, fixed: fixedLog.filter(Boolean).length };
    },
};
