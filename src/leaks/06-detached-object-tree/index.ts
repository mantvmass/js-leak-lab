interface TreeNode {
    payload: string;
    children: TreeNode[];
}

let leakyRoots: TreeNode[] = [];
let fixedProcessed = 0;

let leakTimer: ReturnType<typeof setInterval> | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;

function buildTree(depth: number): TreeNode {
    const node: TreeNode = {
        payload: "t".repeat(500),
        children: [],
    };
    if (depth > 0) {
        for (let i = 0; i < 3; i++) {
            node.children.push(buildTree(depth - 1));
        }
    }
    return node;
}

function processTree(node: TreeNode): number {
    let count = 1;
    for (const child of node.children) count += processTree(child);
    return count;
}

export default {
    id: "06-detached-object-tree",
    label: "Detached Object Tree",
    tag: "detached object tree",
    description: "สร้าง object tree ลึก 5 ชั้นแล้วเก็บ root ไว้ในอาร์เรย์ ไม่เคยลบ ทำให้ tree ทั้งหมดค้างใน heap แม้ไม่ได้ใช้แล้ว",
    badCode: `function buildTree(depth) {
    const node = {
        payload: "t".repeat(500),
        children: [],
    };
    if (depth > 0) {
        for (let i = 0; i < 3; i++) {
            node.children.push(buildTree(depth - 1));
        }
    }
    return node;
}

// เก็บ root ไว้ — tree ทั้ง 3^5=243 nodes ค้างใน heap
const roots = [];

setInterval(() => {
    for (let i = 0; i < 5; i++) {
        const tree = buildTree(5);
        roots.push(tree);
        // tree ถูก retain ถาวร แม้ไม่ได้ใช้แล้ว
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("trees:", roots.length, "heap:", mb.toFixed(1), "MB");
}, 300);`,
    goodCode: `function buildTree(depth) {
    const node = {
        payload: "t".repeat(500),
        children: [],
    };
    if (depth > 0) {
        for (let i = 0; i < 3; i++) {
            node.children.push(buildTree(depth - 1));
        }
    }
    return node;
}

function countNodes(node) {
    let count = 1;
    for (const child of node.children) count += countNodes(child);
    return count;
}

// process ทันที แล้วปล่อย reference
let processed = 0;
setInterval(() => {
    for (let i = 0; i < 5; i++) {
        const tree = buildTree(5);
        countNodes(tree);
        processed++;
        // tree หลุด scope — GC เก็บได้ทันที
    }
    const mb = process.memoryUsage().heapUsed / 1048576;
    console.log("processed:", processed, "heap:", mb.toFixed(1), "MB");
}, 300);`,

    startLeak() {
        this.stopLeak();
        leakTimer = setInterval(() => {
            for (let i = 0; i < 5; i++) {
                leakyRoots.push(buildTree(5));
            }
        }, 300);
    },

    stopLeak() {
        if (leakTimer) { clearInterval(leakTimer); leakTimer = null; }
        leakyRoots.length = 0;
        leakyRoots = [];
        Bun.gc(true);
        // Bun.shrink();
    },

    startFix() {
        this.stopFix();
        fixedProcessed = 0;
        fixTimer = setInterval(() => {
            for (let i = 0; i < 5; i++) {
                const tree = buildTree(5);
                processTree(tree);
                fixedProcessed++;
            }
        }, 300);
    },

    stopFix() {
        if (fixTimer) { clearInterval(fixTimer); fixTimer = null; }
        fixedProcessed = 0;
        Bun.gc(true);
        // Bun.shrink();
    },

    getSize() {
        return { leaky: leakyRoots.length, fixed: fixedProcessed };
    },
};
