import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

let leakyListenerCount = 0;
let leakTimer: ReturnType<typeof setInterval> | null = null;

let fixedHandler: ((...args: any[]) => void) | null = null;
let fixedListenerCount = 0;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function makePayload() {
    return { items: Array.from({ length: 500 }, () => "e".repeat(200)) };
}

export default {
    id: "04-event-listener",
    label: "04-event-listener-title",
    tag: "event listener",
    description: "04-event-listener-description",
    badCode: `const EventEmitter = require("events");
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function makePayload() {
    return { items: Array.from({ length: 500 }, () => "e".repeat(200)) };
}

function handleRequest() {
    const payload = makePayload();
    emitter.on("data", (evt) => {
        void payload.items.length;
    });
    // listener สะสม — closure จับ payload ไว้
    // emitter.listenerCount("data") เพิ่มทุก request
}

setInterval(() => {
    for (let i = 0; i < 20; i++) handleRequest();
    emitter.emit("data", {});
    const count = emitter.listenerCount("data");
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("listeners:", count, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `const EventEmitter = require("events");
const emitter = new EventEmitter();

function makePayload() {
    return { items: Array.from({ length: 500 }, () => "e".repeat(200)) };
}

let currentHandler = null;

function handleRequest() {
    const payload = makePayload();
    if (currentHandler) emitter.off("data", currentHandler);
    currentHandler = (evt) => {
        void payload.items.length;
    };
    emitter.on("data", currentHandler);
    // off() ก่อน on() — listener count คงที่ที่ 1
}

setInterval(() => {
    for (let i = 0; i < 20; i++) handleRequest();
    emitter.emit("data", {});
    const count = emitter.listenerCount("data");
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("listeners:", count, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakyListenerCount = 0;
        leakTimer = setInterval(() => {
            for (let i = 0; i < 20; i++) {
                const payload = makePayload();
                emitter.on("leak-data", () => { void payload.items.length; });
                leakyListenerCount++;
            }
            emitter.emit("leak-data", {});
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        emitter.removeAllListeners("leak-data");
        leakyListenerCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedListenerCount = 0;
        fixTimer = setInterval(() => {
            const payload = makePayload();
            if (fixedHandler) emitter.off("fix-data", fixedHandler);
            fixedHandler = () => { void payload.items.length; };
            emitter.on("fix-data", fixedHandler);
            fixedListenerCount = 1;
            emitter.emit("fix-data", {});
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        if (fixedHandler) { emitter.off("fix-data", fixedHandler); fixedHandler = null; }
        fixedListenerCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyListenerCount, fixed: fixedListenerCount };
    },
};
