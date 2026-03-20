let leakyPromises: { resolve: (v: any) => void; data: string[] }[] = [];
let leakTimer: ReturnType<typeof setInterval> | null = null;

let fixController: AbortController | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;
let fixedCount = 0;

export default {
    id: "07-promise-chain",
    label: "Promise Chain สะสม",
    tag: "promise chain",
    description: "สร้าง Promise ใหม่ทุก tick แล้วเก็บ resolve ไว้ในอาร์เรย์โดยไม่เคย settle ทำให้ Promise object สะสมใน heap พร้อม closure ของแต่ละตัว",
    badCode: `const pending = [];

setInterval(() => {
    for (let i = 0; i < 50; i++) {
        const data = Array.from({ length: 100 }, () => "p".repeat(200));
        const p = new Promise((resolve) => {
            pending.push({ resolve, data });
            // resolve ไม่เคยถูกเรียก
            // Promise + data ค้างถาวร
        });
        p.then(() => {}); // never fires
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("pending:", pending.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `let controller = new AbortController();

function startWork() {
    controller = new AbortController();
    const { signal } = controller;

    return setInterval(() => {
        for (let i = 0; i < 50; i++) {
            const data = Array.from({ length: 100 }, () => "p".repeat(200));
            const p = new Promise((resolve, reject) => {
                if (signal.aborted) return reject("aborted");
                // process data แล้ว resolve ทันที
                void data.length;
                resolve("done");
            });
            p.catch(() => {}); // handle abort
        }
        const mb = process.memoryUsage().heapUsed / 1048576;
        console.log("heap:", mb.toFixed(1), "MB (promises settle immediately)");
    }, 200);
}

const timer = startWork();

// cleanup หลัง 10 วินาที
setTimeout(() => {
    controller.abort();
    clearInterval(timer);
    console.log("stopped");
}, 10000);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 50; i++) {
                const data = Array.from({ length: 100 }, () => "p".repeat(200));
                new Promise((resolve) => {
                    leakyPromises.push({ resolve, data });
                });
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        // resolve all pending promises so they can be GC'd
        for (const p of leakyPromises) p.resolve(null);
        leakyPromises.length = 0;
        leakyPromises = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedCount = 0;
        fixController = new AbortController();
        const signal = fixController.signal;
        fixTimer = setInterval(() => {
            if (signal.aborted) return;
            for (let i = 0; i < 50; i++) {
                const data = Array.from({ length: 100 }, () => "p".repeat(200));
                const p = new Promise<string>((resolve, reject) => {
                    if (signal.aborted) return reject("aborted");
                    void data.length;
                    resolve("done");
                });
                p.then(() => { fixedCount++; }).catch(() => {});
            }
        }, 200);
    },

    stopFix() {
        if (fixController) { fixController.abort(); fixController = null; }
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyPromises.length, fixed: fixedCount };
    },
};
