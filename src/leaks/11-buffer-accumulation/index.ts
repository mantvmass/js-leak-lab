let leakyBuffers: Buffer[] = [];
const POOL_SIZE = 50;
let fixedPool: Buffer[] = [];
let fixedIdx = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

export default {
    id: "11-buffer-accumulation",
    label: "Buffer สะสม",
    tag: "buffer accumulation",
    description: "จอง Buffer.alloc() แล้วเก็บไว้ในอาร์เรย์โดยไม่เคยปล่อย ทำให้ memory โตตาม จำนวน buffer ที่สร้าง ควรใช้ pool ขนาดคงที่แทน",
    badCode: `const buffers = [];

function handleChunk(raw) {
    const buf = Buffer.alloc(4096);
    buf.write(raw);
    buffers.push(buf);
    // buffer สะสมไม่มีที่สิ้นสุด
    // ไม่เคย splice หรือ shift ออก
}

setInterval(() => {
    for (let i = 0; i < 50; i++) {
        handleChunk("data-" + i);
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("buffers:", buffers.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const POOL_SIZE = 50;
const pool = new Array(POOL_SIZE);
let idx = 0;

// pre-allocate pool
for (let i = 0; i < POOL_SIZE; i++) {
    pool[i] = Buffer.alloc(4096);
}

function handleChunk(raw) {
    const buf = pool[idx];
    buf.fill(0);
    buf.write(raw);
    idx = (idx + 1) % POOL_SIZE;
    // reuse buffer จาก pool — memory คงที่
}

setInterval(() => {
    for (let i = 0; i < 50; i++) {
        handleChunk("data-" + i);
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("pool size:", POOL_SIZE, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 50; i++) {
                const buf = Buffer.alloc(4096);
                buf.write("leak-data-" + Date.now());
                leakyBuffers.push(buf);
            }
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyBuffers.length = 0;
        leakyBuffers = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedPool = Array.from({ length: POOL_SIZE }, () => Buffer.alloc(4096));
        fixedIdx = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 50; i++) {
                const buf = fixedPool[fixedIdx]!;
                buf.fill(0);
                buf.write("fix-data-" + Date.now());
                fixedIdx = (fixedIdx + 1) % POOL_SIZE;
            }
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedPool.length = 0;
        fixedPool = [];
        fixedIdx = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyBuffers.length, fixed: fixedPool.length };
    },
};
