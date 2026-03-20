import { initCharts } from "./charts.js";
import { renderCards } from "./cards.js";
import { renderTableRows } from "./table.js";
import { buttonStates } from "./buttons.js";
import { updateUI } from "./gauges.js";
import { connect } from "./websocket.js";
import { toggleMonitor } from "./monitor.js";

let modules = [];
let chartHistory = [];

// Expose global handlers for inline onclick attributes
window.toggleMonitor = toggleMonitor;

window.toggleCard = function (id) {
    const detail = document.getElementById(`detail-${id}`);
    const chevron = document.getElementById(`chevron-${id}`);
    if (!detail) return;
    const isHidden = detail.classList.contains("hidden");
    if (isHidden) {
        detail.classList.remove("hidden");
        if (chevron) chevron.classList.add("open");
    } else {
        detail.classList.add("hidden");
        if (chevron) chevron.classList.remove("open");
    }
};

window.startMode = async function (id, type) {
    const current = buttonStates[id].running;
    if (current) {
        const stopAction = current === "leak" ? "stop-leak" : "stop-fix";
        await fetch(`/leak/${id}/${stopAction}`, { method: "POST" });
    }
    const startAction = type === "leak" ? "start-leak" : "start-fix";
    await fetch(`/leak/${id}/${startAction}`, { method: "POST" });
};

window.stopMode = async function (id) {
    const current = buttonStates[id].running;
    if (!current) return;
    const stopAction = current === "leak" ? "stop-leak" : "stop-fix";
    await fetch(`/leak/${id}/${stopAction}`, { method: "POST" });
};

// Initialize
initCharts();

const cardsEl = document.getElementById("cards");

fetch("/modules")
    .then((r) => r.json())
    .then((mods) => {
        modules = mods;
        renderCards(cardsEl, modules);
        renderTableRows(modules);
    });

connect((snap) => {
    chartHistory = snap.history;
    updateUI(snap, modules, chartHistory);
});
