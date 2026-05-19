// shared/components/loading-component.js

import { escapeHtml } from "../js/utils.js";

/**
 * Render loading toàn phần (thường dùng khi thay thế toàn bộ nội dung)
 * @param {Object} options
 * @param {string} options.message - Nội dung hiển thị (mặc định "Đang tải dữ liệu...")
 * @returns {string} HTML string
 */
export function renderLoading({ message = "Đang tải dữ liệu..." } = {}) {
    return `
        <div class="loading-component">
            <div class="loading-content">
                <i class="fas fa-spinner"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        </div>
    `;
}

/**
 * Render loading inline (dùng trong bảng, chiếm một ô duy nhất)
 * @param {Object} options
 * @param {string} options.message - Nội dung hiển thị (mặc định "Đang tải...")
 * @param {number} options.colspan - Số cột chiếm dụng
 * @param {string} options.containerTag - Thẻ chứa (td hoặc th)
 * @returns {string} HTML string
 */
export function renderInlineLoading({ message = "Đang tải...", colspan = 1, containerTag = "td" } = {}) {
    return `
        <tr class="loading-row">
            <${containerTag} colspan="${colspan}" style="text-align: center; padding: 40px 0;">
                <div class="inline-loading">
                    <i class="fas fa-spinner"></i>
                    <span>${escapeHtml(message)}</span>
                </div>
            </${containerTag}>
        </tr>
    `;
}

// Tự động thêm CSS (chỉ một lần)
(function injectStyles() {
    if (document.getElementById('loading-component-styles')) return;
    const style = document.createElement('style');
    style.id = 'loading-component-styles';
    style.textContent = `
        .loading-component {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 40px;
            background: transparent;
        }
        .loading-content {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--muted, #94a3b8);
            background: rgba(0, 0, 0, 0.6);
            padding: 16px 24px;
            border-radius: 40px;
            backdrop-filter: blur(8px);
        }
        .loading-content i {
            font-size: 24px;
            color: var(--primary, #3b82f6);
            animation: spin 1s linear infinite;
        }
        .inline-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            color: var(--muted, #94a3b8);
        }
        .inline-loading i {
            font-size: 20px;
            color: var(--primary, #3b82f6);
            animation: spin 1s linear infinite;
        }
        .loading-row td {
            text-align: center;
            background: transparent;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
})();   