import { CRIT_BYTES } from "./utils.js";

function chartColorFn(ctx) {
    const data = ctx.chart.data.datasets[0].data;
    if (!data.length) return "#4ade80";
    const max = Math.max(...data);
    return max >= CRIT_BYTES ? "#f87171" : "#4ade80";
}

function chartFillFn(ctx) {
    const data = ctx.chart.data.datasets[0].data;
    const max = data.length ? Math.max(...data) : 0;
    return max >= CRIT_BYTES
        ? "rgba(248, 113, 113, 0.08)"
        : "rgba(74, 222, 128, 0.05)";
}

function makeChartConfig() {
    return {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: (ctx) => chartColorFn(ctx),
                borderWidth: 1.5,
                pointRadius: 0,
                tension: 0.2,
                fill: { target: "origin", above: (ctx) => chartFillFn(ctx) },
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: "#1f2937", drawTicks: false },
                    ticks: {
                        color: "#6b7280",
                        font: { size: 10, family: "ui-monospace, monospace" },
                        maxRotation: 0, autoSkip: true, maxTicksLimit: 5,
                    },
                    border: { display: false },
                },
                y: {
                    grid: { color: "#1f2937", drawTicks: false },
                    ticks: {
                        color: "#6b7280",
                        font: { size: 10, family: "ui-monospace, monospace" },
                        callback: (v) => (v / 1048576).toFixed(0) + "MB",
                    },
                    border: { display: false },
                    beginAtZero: true,
                },
            },
        },
    };
}

export let heapChart = null;
export let heapChartMobile = null;

export function initCharts() {
    const canvas = document.getElementById("heap-chart");
    if (canvas) heapChart = new Chart(canvas, makeChartConfig());

    const canvasM = document.getElementById("heap-chart-m");
    if (canvasM) heapChartMobile = new Chart(canvasM, makeChartConfig());
}

export function updateChart(chartHistory, monitorOpen) {
    if (!chartHistory.length) return;

    const nowTs = chartHistory[chartHistory.length - 1].ts;
    const labels = chartHistory.map((p) => {
        const secsAgo = Math.round((nowTs - p.ts) / 1000);
        if (secsAgo === 0) return "now";
        return `-${secsAgo}s`;
    });
    const data = chartHistory.map((p) => p.heapUsed);

    if (heapChart) {
        heapChart.data.labels = labels;
        heapChart.data.datasets[0].data = data;
        heapChart.update("none");
    }
    if (heapChartMobile && monitorOpen) {
        heapChartMobile.data.labels = labels;
        heapChartMobile.data.datasets[0].data = data;
        heapChartMobile.update("none");
    }
}
