// shared/components/dialog.js
export function showConfirmDialog({
    title = "Xác nhận",
    message = "Bạn có chắc chắn?",
    detailsHtml = "",
    confirmText = "Đồng ý",
    cancelText = "Hủy",
    confirmType = "danger" // "primary" hoặc "danger"
} = {}) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog-confirm';
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>${escapeHtml(title)}</h3>
                <button class="dialog-close-btn">&times;</button>
            </div>
            <div class="dialog-body">
                <p>${escapeHtml(message)}</p>
                ${detailsHtml ? `<div class="dialog-details">${detailsHtml}</div>` : ''}
            </div>
            <div class="dialog-footer">
                <button class="dialog-btn dialog-btn-cancel">${escapeHtml(cancelText)}</button>
                <button class="dialog-btn dialog-btn-confirm ${confirmType}">${escapeHtml(confirmText)}</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const confirmBtn = dialog.querySelector('.dialog-btn-confirm');
        const cancelBtn = dialog.querySelector('.dialog-btn-cancel');
        const closeBtn = dialog.querySelector('.dialog-close-btn');
        
        const close = (result) => {
            overlay.remove();
            resolve(result);
        };
        
        confirmBtn.addEventListener('click', () => close(true));
        cancelBtn.addEventListener('click', () => close(false));
        closeBtn.addEventListener('click', () => close(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(false);
        });
        dialog.addEventListener('click', (e) => e.stopPropagation());
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// Tự động nhúng CSS (giữ nguyên)
(function injectStyles() {
    if (document.getElementById('dialog-confirm-styles')) return;
    const style = document.createElement('style');
    style.id = 'dialog-confirm-styles';
    style.textContent = `
        .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            animation: fadeIn 0.2s ease;
        }
        .dialog-confirm {
            width: fit-content;
            min-width: 360px;
            max-width: 480px;
            height: fit-content;
            background: var(--card, rgba(15, 23, 42, 0.96));
            backdrop-filter: blur(12px);
            border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
            border-radius: 20px;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            animation: slideUp 0.2s ease;
        }
        .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 20px;
            border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }
        .dialog-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text, #e5e7eb);
        }
        .dialog-close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--muted, #94a3b8);
            transition: color 0.2s;
        }
        .dialog-close-btn:hover {
            color: #ef4444;
        }
        .dialog-body {
            padding: 24px 20px;
        }
        .dialog-body p {
            margin: 0;
            font-size: 15px;
            color: var(--text, #e5e7eb);
            line-height: 1.5;
        }
        .dialog-details {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
            font-size: 13px;
            color: var(--muted, #94a3b8);
        }
        .dialog-details ul {
            margin: 8px 0 0 18px;
        }
        .dialog-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 20px;
            border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }
        .dialog-btn {
            padding: 10px 24px;
            border-radius: 40px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }
        .dialog-btn-cancel {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text, #e5e7eb);
            border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
        }
        .dialog-btn-cancel:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        .dialog-btn-confirm {
            background: var(--primary, #3b82f6);
            color: white;
        }
        .dialog-btn-confirm:hover {
            background: var(--primary-dark, #2563eb);
            transform: translateY(-1px);
        }
        .dialog-btn-confirm.danger {
            background: #ef4444;
        }
        .dialog-btn-confirm.danger:hover {
            background: #dc2626;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
})();