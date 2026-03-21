let leakTimerRef: ReturnType<typeof setTimeout> | null = null;
let leakyDepth = 0;
let leakyCallbacks: (() => void)[] = [];
let leakStopped = false;

let fixInterval: ReturnType<typeof setInterval> | null = null;
let fixedTicks = 0;

function makeHeavyArray() {
    return Array.from({ length: 1000 }, (_, i) => ({
        idx: i,
        blob: "n".repeat(500),
    }));
}

function leakyRecurse() {
    if (leakStopped) return;
    const data = makeHeavyArray();
    leakyDepth++;
    const cb = () => {
        void data.length;
        if (!leakStopped) leakyRecurse();
    };
    leakyCallbacks.push(cb);
    leakTimerRef = setTimeout(cb, 100);
}

export default {
    id: "08-timer-in-loop",
    label: "08-timer-in-loop-title",
    tag: "nested timer",
    description: "08-timer-in-loop-description",
    badCode: `function makeHeavyArray() {
    return Array.from({ length: 1000 }, (_, i) => ({
        idx: i,
        blob: "n".repeat(500),
    }));
}

const callbacks = []; // retain ทุก closure

function poll() {
    const data = makeHeavyArray();
    const cb = () => {
        void data.length;
        poll();
    };
    callbacks.push(cb); // closure + data ค้างถาวร
    setTimeout(cb, 100);
}

poll();

setInterval(() => {
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("callbacks:", callbacks.length, "heap:", mb.toFixed(1), "MB");
}, 1000);`,
    goodCode: `function makeHeavyArray() {
    return Array.from({ length: 1000 }, (_, i) => ({
        idx: i,
        blob: "n".repeat(500),
    }));
}

// setInterval เดียว — ไม่มี closure chain
const interval = setInterval(() => {
    const data = makeHeavyArray();
    void data.length;
    // data หลุด scope ทุก tick — GC เก็บได้
}, 100);

setInterval(() => {
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("heap:", mb.toFixed(1), "MB (stable)");
}, 1000);

// cleanup
// clearInterval(interval);`,

    startLeak() {
        this.stopLeak();
        leakStopped = false;
        leakyDepth = 0;
        leakyCallbacks = [];
        leakyRecurse();
    },

    stopLeak() {
        leakStopped = true;
        if (leakTimerRef) { clearTimeout(leakTimerRef); leakTimerRef = null; }
        leakyDepth = 0;
        leakyCallbacks.length = 0;
        leakyCallbacks = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedTicks = 0;
        fixInterval = setInterval(() => {
            const data = makeHeavyArray();
            void data.length;
            fixedTicks++;
        }, 100);
    },

    stopFix() {
        if (fixInterval) { clearInterval(fixInterval); fixInterval = null; }
        fixedTicks = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyCallbacks.length, fixed: fixedTicks };
    },
};
