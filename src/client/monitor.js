import { heapChartMobile } from "./charts.js";

export let monitorOpen = false;

export function toggleMonitor() {
    monitorOpen = !monitorOpen;
    const content = document.getElementById("monitor-content");
    const toggleText = document.getElementById("toggle-text");
    if (monitorOpen) {
        content.classList.remove("hidden");
        toggleText.textContent = "ซ่อน Monitor";
        if (heapChartMobile) heapChartMobile.resize();
    } else {
        content.classList.add("hidden");
        toggleText.textContent = "แสดง Monitor";
    }
}
