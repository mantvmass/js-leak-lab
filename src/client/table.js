import { escHtml } from "./utils.js";

export function renderTableRows(modules) {
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

export function updateTableRow(rowId, sizes) {
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
