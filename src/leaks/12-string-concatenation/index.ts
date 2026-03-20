let leakyStrings: string[] = [];
let fixedCount = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

export default {
    id: "12-string-concatenation",
    label: "String Concatenation สะสม",
    tag: "string concat",
    description: "ต่อ string ด้วย += ใน loop แต่ละรอบสร้าง string ใหม่ที่ใหญ่ขึ้นเรื่อย ๆ แล้วเก็บผลลัพธ์ไว้ทั้งหมด ควรใช้ array collect แล้ว join ครั้งเดียว",
    badCode: `const results = [];

function buildReport(entries) {
    let report = "";
    for (const entry of entries) {
        report += JSON.stringify(entry) + "\\n";
        // += สร้าง string ใหม่ทุกรอบ
        // string เก่าค้างรอ GC
    }
    results.push(report);
    // results โตไม่หยุด
}

setInterval(() => {
    const entries = Array.from({ length: 200 }, (_, i) => ({
        id: i, data: "r".repeat(100)
    }));
    buildReport(entries);
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("reports:", results.length, "heap:", mb.toFixed(1), "MB");
}, 200);`,
    goodCode: `function buildReport(entries) {
    // collect แล้ว join ครั้งเดียว — ไม่สร้าง intermediate strings
    const lines = entries.map(e => JSON.stringify(e));
    const report = lines.join("\\n");
    // ใช้แล้วทิ้ง — ไม่เก็บสะสม
    return report;
}

let processed = 0;
setInterval(() => {
    const entries = Array.from({ length: 200 }, (_, i) => ({
        id: i, data: "r".repeat(100)
    }));
    const report = buildReport(entries);
    void report.length; // use it
    processed++;
    // report หลุด scope — GC เก็บได้
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("processed:", processed, "heap:", mb.toFixed(1), "MB");
}, 200);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            const entries = Array.from({ length: 200 }, (_, i) => ({
                id: i, data: "r".repeat(100),
            }));
            let report = "";
            for (const entry of entries) {
                report += JSON.stringify(entry) + "\n";
            }
            leakyStrings.push(report);
        }, 200);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyStrings.length = 0;
        leakyStrings = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedCount = 0;
        fixTimer = setInterval(() => {
            const entries = Array.from({ length: 200 }, (_, i) => ({
                id: i, data: "r".repeat(100),
            }));
            const report = entries.map(e => JSON.stringify(e)).join("\n");
            void report.length;
            fixedCount++;
        }, 200);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedCount = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyStrings.length, fixed: fixedCount };
    },
};
