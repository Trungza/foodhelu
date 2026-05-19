// shared/components/input-dialog.js
let stylesInjected = false;

function injectDialogStyles() {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    .input-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .input-dialog-container {
      background: #ffffff;
      border-radius: 24px;
      width: 90%;
      max-width: 450px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 20px 35px rgba(15, 23, 42, 0.14);
      animation: dialogFadeIn 0.2s ease;
    }
    @keyframes dialogFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .input-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    }
    .input-dialog-header h3 {
      margin: 0;
      color: #0f172a;
      font-size: 1.2rem;
    }
    .input-dialog-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #64748b;
      transition: color 0.2s;
    }
    .input-dialog-close:hover {
      color: #f87171;
    }
    .input-dialog-body {
      padding: 1.5rem;
    }
    .input-dialog-body p {
      color: #475569;
      margin-bottom: 1rem;
    }
    #input-dialog-field {
      width: 100%;
      padding: 0.75rem;
      background: #ffffff;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      color: #0f172a;
      font-size: 0.95rem;
      outline: none;
      transition: border 0.2s;
    }
    #input-dialog-field:focus {
      border-color: #3b82f6;
    }
    .input-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
    }
    .input-dialog-footer button {
      padding: 0.5rem 1.2rem;
      border-radius: 40px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn-cancel {
      background: rgba(255,255,255,0.96);
      color: #0f172a;
    }
    .btn-cancel:hover {
      background: rgba(59, 130, 246, 0.08);
    }
    .btn-confirm {
      background: #3b82f6;
      color: #ffffff;
    }
    .btn-confirm:hover {
      background: #2563eb;
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return char;
  });
}

export function showInputDialog({ title, message, placeholder = "", defaultValue = "", confirmText = "OK", cancelText = "Hủy" }) {
  return new Promise((resolve) => {
    injectDialogStyles();
    
    const modal = document.createElement("div");
    modal.className = "input-dialog-overlay";
    modal.innerHTML = `
      <div class="input-dialog-container">
        <div class="input-dialog-header">
          <h3>${escapeHtml(title)}</h3>
          <button class="input-dialog-close">&times;</button>
        </div>
        <div class="input-dialog-body">
          <p>${escapeHtml(message)}</p>
          <input type="text" id="input-dialog-field" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" autofocus />
        </div>
        <div class="input-dialog-footer">
          <button class="btn-cancel">${escapeHtml(cancelText)}</button>
          <button class="btn-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector("#input-dialog-field");
    const confirmBtn = modal.querySelector(".btn-confirm");
    const cancelBtn = modal.querySelector(".btn-cancel");
    const closeBtn = modal.querySelector(".input-dialog-close");

    const close = (value) => {
      modal.remove();
      resolve(value);
    };

    confirmBtn.onclick = () => close(input.value.trim() || null);
    cancelBtn.onclick = () => close(null);
    closeBtn.onclick = () => close(null);
    modal.onclick = (e) => { if (e.target === modal) close(null); };
    input.addEventListener("keypress", (e) => { if (e.key === "Enter") close(input.value.trim() || null); });

    input.focus();
  });
}