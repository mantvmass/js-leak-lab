import { escHtml } from "./utils.js";
import { initButtonState } from "./buttons.js";

let languageData = null;

function getText(key, defaultText) {
    const lang = localStorage.getItem("preferredLanguage") === "en" ? "en" : "th";
    if (languageData && languageData[lang] && languageData[lang][key]) {
        return languageData[lang][key];
    }
    if (window.translations && window.translations[key]) {
        return window.translations[key];
    }
    return defaultText;
}

export async function renderCards(cardsEl, modules) {
    cardsEl.innerHTML = "";

    if (!languageData) {
        try {
            const res = await fetch("../language.json");
            languageData = await res.json();
            console.log(languageData);
            
        } catch (err) {
            console.warn("Could not load language.json", err);
        }
    }

    for (const m of modules) {
        initButtonState(m.id);
        const card = document.createElement("div");
        card.className = "bg-gray-900 rounded-lg p-4";
        card.id = `card-${m.id}`;

        const badHighlighted = Prism.highlight(m.badCode, Prism.languages.javascript, "javascript");
        const goodHighlighted = Prism.highlight(m.goodCode, Prism.languages.javascript, "javascript");

        card.innerHTML = `
        <div class="flex items-center gap-2 mb-2 cursor-pointer" onclick="toggleCard('${m.id}')">
            <span class="text-sm font-medium" data-i18n-label="${m.label}">${escHtml(getText(m.label, m.label))}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">${escHtml(m.tag)}</span>
            <span class="ml-auto text-xs text-gray-600 card-chevron" id="chevron-${m.id}">&#9660;</span>
        </div>
        <p class="text-xs text-gray-500 mb-3 leading-relaxed" data-i18n-desc="${m.description}">${escHtml(getText(m.description, m.description))}</p>
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

// ตรวจจับ Event การเปลี่ยนภาษา จาก index.html และอัปเดต Card ทันที
document.addEventListener('languageChanged', () => {
    const lang = localStorage.getItem("preferredLanguage") === "en" ? "en" : "th";
    
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-label');
        const newText = (languageData && languageData[lang] && languageData[lang][key]) || window.translations?.[key] || key;
        el.textContent = newText;
    });

    document.querySelectorAll('[data-i18n-desc]').forEach(el => {
        const key = el.getAttribute('data-i18n-desc');
        const newText = (languageData && languageData[lang] && languageData[lang][key]) || window.translations?.[key] || key;
        el.textContent = newText;
    });
});
