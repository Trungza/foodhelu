// utils.js
export function formatCurrency(amount) {
    return amount.toLocaleString("vi-VN") + "đ";
}

export function formatDateTime(dateStr) {
    if (!dateStr) return "Không có";
    return new Date(dateStr).toLocaleString("vi-VN");
}

export function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}