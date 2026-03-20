export const buttonStates = {};

export function initButtonState(id) {
    buttonStates[id] = { running: null };
}

export function renderButtons(id) {
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

export function syncButtonStates(modules, runningStates) {
    if (!runningStates) return;
    for (const m of modules) {
        const serverState = runningStates[m.id] ?? null;
        if (buttonStates[m.id] && buttonStates[m.id].running !== serverState) {
            buttonStates[m.id].running = serverState;
            renderButtons(m.id);
        }
    }
}
