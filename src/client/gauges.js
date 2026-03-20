import { toMB } from "./utils.js";
import { syncButtonStates } from "./buttons.js";
import { updateTableRow } from "./table.js";
import { updateChart } from "./charts.js";
import { monitorOpen } from "./monitor.js";

function setGauge(id, bytes, maxGauge) {
    const pct = Math.min((bytes / maxGauge) * 100, 100);
    const el = document.getElementById(`gauge-${id}`);
    const valEl = document.getElementById(`gauge-${id}-val`);
    if (el) {
        el.style.width = pct + "%";
        el.classList.remove("warn", "crit");
        if (pct > 75) el.classList.add("crit");
        else if (pct > 50) el.classList.add("warn");
    }
    if (valEl) valEl.textContent = toMB(bytes) + " MB";
}

export function updateUI(snap, modules, chartHistory) {
    const heapInline = document.getElementById("heap-used-inline");

    // Sync button states from server
    syncButtonStates(modules, snap.runningStates);

    const maxGauge = 512 * 1048576;

    // Desktop gauges
    setGauge("rss", snap.rss, maxGauge);
    setGauge("heap-used", snap.heapUsed, maxGauge);
    setGauge("heap-total", snap.heapTotal, maxGauge);
    setGauge("external", snap.external, maxGauge);

    // Mobile gauges
    setGauge("rss-m", snap.rss, maxGauge);
    setGauge("heap-used-m", snap.heapUsed, maxGauge);
    setGauge("heap-total-m", snap.heapTotal, maxGauge);
    setGauge("external-m", snap.external, maxGauge);

    // Mobile inline heap
    if (heapInline) heapInline.textContent = toMB(snap.heapUsed) + " MB";

    // Update tables + counters
    for (const m of modules) {
        const sizes = snap.leakSizes[m.id];
        if (!sizes) continue;

        const counterEl = document.getElementById(`counter-${m.id}`);
        if (counterEl) {
            const leakySpan = sizes.leaky > 100
                ? `<span class="text-red-400">leaky: ${sizes.leaky}</span>`
                : `leaky: ${sizes.leaky}`;
            counterEl.innerHTML = `${leakySpan}  fixed: ${sizes.fixed}`;
        }

        updateTableRow(`row-${m.id}`, sizes);
        updateTableRow(`row-m-${m.id}`, sizes);
    }

    updateChart(chartHistory, monitorOpen);
}
