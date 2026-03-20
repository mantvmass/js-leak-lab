(function () {
    function escHtml(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    const cardsEl = document.getElementById("cards");
    const statusEl = document.getElementById("conn-status");
    const statusElMobile = document.getElementById("conn-status-mobile");
    const heapInline = document.getElementById("heap-used-inline");

    const CRIT_MB = 1024;
    const CRIT_BYTES = CRIT_MB * 1048576;

    let modules = [];
    let chartHistory = [];
    let buttonStates = {};
    let heapChart = null;
    let heapChartMobile = null;
    let monitorOpen = false;

    // Mobile monitor toggle
    window.toggleMonitor = function () {
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
    };

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

    function initCharts() {
        const canvas = document.getElementById("heap-chart");
        if (canvas) heapChart = new Chart(canvas, makeChartConfig());

        const canvasM = document.getElementById("heap-chart-m");
        if (canvasM) heapChartMobile = new Chart(canvasM, makeChartConfig());
    }
    initCharts();

    fetch("/modules")
        .then((r) => r.json())
        .then((mods) => {
            modules = mods;
            renderCards();
            renderTableRows();
        });

    function renderCards() {
        cardsEl.innerHTML = "";
        for (const m of modules) {
            buttonStates[m.id] = { running: null };
            const card = document.createElement("div");
            card.className = "bg-gray-900 rounded-lg p-4";
            card.id = `card-${m.id}`;

            const badHighlighted = Prism.highlight(m.badCode, Prism.languages.javascript, "javascript");
            const goodHighlighted = Prism.highlight(m.goodCode, Prism.languages.javascript, "javascript");

            card.innerHTML = `
        <div class="flex items-center gap-2 mb-2 cursor-pointer" onclick="toggleCard('${m.id}')">
          <span class="text-sm font-medium">${escHtml(m.label)}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">${escHtml(m.tag)}</span>
          <span class="ml-auto text-xs text-gray-600 card-chevron" id="chevron-${m.id}">&#9660;</span>
        </div>
        <p class="text-xs text-gray-500 mb-3 leading-relaxed">${escHtml(m.description)}</p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <div class="btn-group flex flex-wrap gap-2" id="btns-${m.id}">
            <button onclick="startMode('${m.id}','leak')" class="text-sm px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Start Bad Code</button>
            <button onclick="startMode('${m.id}','fix')" class="text-sm px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">Start Good Code</button>
          </div>
          <span class="ml-auto text-xs text-gray-500 counter" id="counter-${m.id}">leaky: 0  fixed: 0</span>
        </div>
        <div class="hidden card-detail" id="detail-${m.id}">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div class="text-xs text-red-400 mb-1 font-medium">Bad Code</div>
              <pre class="code-block border-l-2 border-red-500/50"><code class="language-javascript">${badHighlighted}</code></pre>
            </div>
            <div>
              <div class="text-xs text-green-400 mb-1 font-medium">Good Code</div>
              <pre class="code-block border-l-2 border-green-500/50"><code class="language-javascript">${goodHighlighted}</code></pre>
            </div>
          </div>
        </div>`;
            cardsEl.appendChild(card);
        }
    }

    function renderTableRows() {
        // Desktop table
        const tableBody = document.getElementById("size-table");
        if (tableBody) {
            tableBody.innerHTML = "";
            for (const m of modules) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-800/50";
                tr.id = `row-${m.id}`;
                tr.innerHTML = `
            <td class="py-1.5 text-gray-400">${escHtml(m.tag)}</td>
            <td class="text-right py-1.5 tabular-nums">0</td>
            <td class="text-right py-1.5 tabular-nums">0</td>
            <td class="text-right py-1.5 tabular-nums">0</td>`;
                tableBody.appendChild(tr);
            }
        }
        // Mobile table
        const tableMobile = document.getElementById("size-table-mobile");
        if (tableMobile) {
            tableMobile.innerHTML = "";
            for (const m of modules) {
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-800/50";
                tr.id = `row-m-${m.id}`;
                tr.innerHTML = `
            <td class="py-1 text-gray-400">${escHtml(m.tag)}</td>
            <td class="text-right py-1 tabular-nums">0</td>
            <td class="text-right py-1 tabular-nums">0</td>
            <td class="text-right py-1 tabular-nums">0</td>`;
                tableMobile.appendChild(tr);
            }
        }
    }

    function renderButtons(id) {
        const container = document.getElementById(`btns-${id}`);
        const running = buttonStates[id].running;

        if (!running) {
            container.innerHTML = `
                <button onclick="startMode('${id}','leak')" class="text-sm px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Start Bad Code</button>
                <button onclick="startMode('${id}','fix')" class="text-sm px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">Start Good Code</button>`;
        } else if (running === "leak") {
            container.innerHTML = `
                <button onclick="stopMode('${id}')" class="text-sm px-4 py-2 rounded-lg bg-red-500/30 text-red-300 hover:bg-red-500/40 transition-colors">Stop Bad Code</button>`;
        } else {
            container.innerHTML = `
                <button onclick="stopMode('${id}')" class="text-sm px-4 py-2 rounded-lg bg-green-500/30 text-green-300 hover:bg-green-500/40 transition-colors">Stop Good Code</button>`;
        }
    }

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

    // WebSocket
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

    function connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}`);
        ws.onopen = () => { reconnectDelay = 500; setConnStatus(true); };
        ws.onclose = () => {
            setConnStatus(false);
            setTimeout(connect, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 10000);
        };
        ws.onmessage = (e) => {
            const snap = JSON.parse(e.data);
            chartHistory = snap.history;
            updateUI(snap);
        };
    }
    connect();

    function toMB(bytes) {
        return (bytes / 1048576).toFixed(1);
    }

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

    function updateUI(snap) {
        // Sync button states from server
        if (snap.runningStates) {
            for (const m of modules) {
                const serverState = snap.runningStates[m.id] ?? null;
                if (buttonStates[m.id] && buttonStates[m.id].running !== serverState) {
                    buttonStates[m.id].running = serverState;
                    renderButtons(m.id);
                }
            }
        }

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

            // Desktop row
            updateTableRow(`row-${m.id}`, sizes);
            // Mobile row
            updateTableRow(`row-m-${m.id}`, sizes);
        }

        updateChart();
    }

    function updateTableRow(rowId, sizes) {
        const row = document.getElementById(rowId);
        if (!row) return;
        const cells = row.querySelectorAll("td");
        cells[1].textContent = sizes.leaky;
        cells[2].textContent = sizes.fixed;
        const delta = sizes.leaky - sizes.fixed;
        cells[3].textContent = delta;
        cells[3].className = delta > 50
            ? "text-right py-1.5 tabular-nums text-red-400"
            : "text-right py-1.5 tabular-nums";
    }

    function updateChart() {
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
})();
