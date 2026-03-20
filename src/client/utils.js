export const CRIT_MB = 1024;
export const CRIT_BYTES = CRIT_MB * 1048576;

export function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toMB(bytes) {
    return (bytes / 1048576).toFixed(1);
}
