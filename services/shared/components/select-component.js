import { escapeHtml } from "../js/utils.js";

export function renderSelect({
    id = '',
    className = '',
    options = [],
    selectedValue = '',
    includeEmptyOption = false,
    emptyOptionLabel = 'Tất cả'
} = {}) {
    const selectId = id ? `id="${escapeHtml(id)}"` : '';
    const selectClass = `admin-select ${className}`.trim();
    
    let optionsHtml = '';
    
    if (includeEmptyOption) {
        optionsHtml += `<option value="" style="background: #1e293b; color: #e5e7eb;">${escapeHtml(emptyOptionLabel)}</option>`;
    }
    
    options.forEach(opt => {
        const isSelected = (selectedValue !== undefined && String(opt.value) === String(selectedValue));
        optionsHtml += `<option value="${escapeHtml(opt.value)}" style="background: #1e293b; color: #e5e7eb;" ${isSelected ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`;
    });
    
    return `
        <select ${selectId} class="${selectClass}" style="padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #e5e7eb; font-size: 13px; font-weight: 500; cursor: pointer; outline: none; backdrop-filter: blur(4px);">
            ${optionsHtml}
        </select>
    `;
}

// Tự động nhúng CSS cho select (chỉ một lần)
(function injectSelectStyles() {
    if (document.getElementById('admin-select-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-select-styles';
    style.textContent = `
        .admin-select {
            padding: 8px 14px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.05);
            color: #e5e7eb;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            outline: none;
            backdrop-filter: blur(4px);
        }
        .admin-select option {
            background: #1e293b;
            color: #e5e7eb;
        }
        .admin-select:focus {
            border-color: rgba(59,130,246,0.5);
            box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
        }
    `;
    document.head.appendChild(style);
})();