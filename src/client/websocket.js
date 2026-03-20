const statusEl = document.getElementById("conn-status");
const statusElMobile = document.getElementById("conn-status-mobile");

let ws = null;
let reconnectDelay = 500;

function setConnStatus(connected) {
    const text = connected ? "เชื่อมต่อแล้ว" : "กำลังเชื่อมต่อใหม่";
    const cls = connected
        ? "text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400"
        : "text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500";
    if (statusEl) { statusEl.textContent = text; statusEl.className = cls; }
    if (statusElMobile) { statusElMobile.textContent = text; statusElMobile.className = cls; }
}

export function connect(onMessage) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);
    ws.onopen = () => { reconnectDelay = 500; setConnStatus(true); };
    ws.onclose = () => {
        setConnStatus(false);
        setTimeout(() => connect(onMessage), reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 10000);
    };
    ws.onmessage = (e) => {
        const snap = JSON.parse(e.data);
        onMessage(snap);
    };
}
