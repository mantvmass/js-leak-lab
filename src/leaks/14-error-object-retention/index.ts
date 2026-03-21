let leakyErrors: Error[] = [];
let fixedLog: { message: string; stack: string | undefined; ts: number }[] = [];

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function generateError() {
    const context = Array.from({ length: 200 }, () => "e".repeat(200));
    try {
        throw new Error("something failed: " + context[0]!.slice(0, 50));
    } catch (err) {
        return err as Error;
    }
}

export default {
    id: "14-error-object-retention",
    label: "14-error-object-retention-title",
    tag: "error retention",
    description: "14-error-object-retention-description",
    badCode: `const errorLog = [];

function processRequest() {
    const context = Array.from({ length: 200 }, () => "e".repeat(200));
    try {
        throw new Error("failed: " + context[0].slice(0, 50));
    } catch (err) {
        errorLog.push(err);
        // Error object เก็บ stack trace + scope reference
        // context ไม่ถูก GC เพราะ Error ยังอ้างอยู่
    }
}

setInterval(() => {
    for (let i = 0; i < 20; i++) processRequest();
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("errors:", errorLog.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const MAX_LOG = 100;
const errorLog = [];

function processRequest() {
    const context = Array.from({ length: 200 }, () => "e".repeat(200));
    try {
        throw new Error("failed: " + context[0].slice(0, 50));
    } catch (err) {
        // เก็บแค่ string — ไม่ retain Error object + scope
        errorLog.push({
            message: err.message,
            stack: err.stack,
            ts: Date.now()
        });
        if (errorLog.length > MAX_LOG) errorLog.shift();
    }
}

setInterval(() => {
    for (let i = 0; i < 20; i++) processRequest();
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("errors:", errorLog.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 20; i++) {
                leakyErrors.push(generateError());
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyErrors.length = 0;
        leakyErrors = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedLog = [];
        fixTimer = setInterval(() => {
            for (let i = 0; i < 20; i++) {
                const err = generateError();
                fixedLog.push({ message: err.message, stack: err.stack, ts: Date.now() });
                if (fixedLog.length > 100) fixedLog.shift();
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedLog.length = 0;
        fixedLog = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyErrors.length, fixed: fixedLog.length };
    },
};
