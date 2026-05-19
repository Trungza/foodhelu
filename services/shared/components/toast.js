export function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white; padding: 12px 24px; border-radius: 40px;
        font-size: 14px; font-weight: 500; z-index: 2147483647;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: fadeInOut 3s ease forwards;
        white-space: nowrap;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Gắn vào window để dùng mọi nơi (kể cả inline onclick, hoặc file không muốn import)
if (typeof window !== 'undefined') {
    window.showToast = showToast;
}