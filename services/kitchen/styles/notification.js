export const notificationStyle = `
    /* Badge chuông */
    .notification-bell {
        position: relative;
        cursor: pointer;
        color: #64748b;
        font-size: 1.4rem;
        padding: 8px;
        border-radius: 14px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.16);
    }
    .notification-bell:hover {
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.08);
        transform: translateY(-2px);
    }
    .badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        font-weight: bold;
        min-width: 18px;
        height: 18px;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid #0f172a;
        box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4);
    }

    /* Modal thông báo */
    .notifications-modal {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        padding: 20px;
    }
    .modal-overlay {
        position: absolute; width: 100%; height: 100%;
        background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px);
        animation: modalFadeIn 0.3s ease;
    }
    .modal-container {
        position: relative;
        background: #ffffff; border-radius: 32px;
        width: 90%; max-width: 480px; max-height: 85vh;
        display: flex; flex-direction: column;
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.14);
        animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: hidden;
    }
    @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalSlideUp { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    .modal-header {
        padding: 24px 28px; border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        display: flex; justify-content: space-between; align-items: center;
        background: rgba(248, 250, 252, 0.96);
    }
    .modal-header h3 {
        margin: 0; font-size: 1.25rem; color: #0f172a;
        display: flex; align-items: center; gap: 10px;
    }
    .modal-close {
        background: none; border: none; font-size: 1.8rem;
        color: #64748b; cursor: pointer; transition: color 0.2s;
    }
    .modal-close:hover { color: #f87171; }

    .modal-body {
        padding: 24px; overflow-y: auto; flex: 1;
        scrollbar-width: thin;
        scrollbar-color: #334155 transparent;
    }
    .modal-body::-webkit-scrollbar { width: 5px; }
    .modal-body::-webkit-scrollbar-track { background: transparent; }
    .modal-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
    .modal-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

    .notifications-list { display: flex; flex-direction: column; gap: 12px; }

    .mark-all-read-btn { 
        background: rgba(59, 130, 246, 0.08); color: #2563eb; 
        border: 1px solid rgba(59, 130, 246, 0.15); padding: 12px; 
        border-radius: 16px; cursor: pointer; font-weight: 600; transition: 0.2s;
        font-size: 0.9rem;
    }
    .mark-all-read-btn:hover { background: rgba(59, 130, 246, 0.15); transform: translateY(-1px); }

    /* Item thông báo */
    .notification-item {
        background: rgba(248, 250, 252, 0.96); border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 20px; padding: 18px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative; display: flex; flex-direction: column; gap: 8px;
    }
    .notification-item:hover {
        background: #ffffff;
        border-color: rgba(59, 130, 246, 0.16);
        transform: scale(1.01);
    }
    .notification-item.unread {
        background: rgba(59, 130, 246, 0.05); 
        border-left: 4px solid #3b82f6;
        border-color: rgba(59, 130, 246, 0.1) rgba(59, 130, 246, 0.1) rgba(59, 130, 246, 0.1) #3b82f6;
    }
    .notification-item.unread::after {
        content: ''; position: absolute; right: 18px; top: 18px;
        width: 8px; height: 8px; background: #3b82f6; border-radius: 50%;
        box-shadow: 0 0 10px #3b82f6;
    }

    .noti-message {
        color: #334155; font-size: 0.95rem; line-height: 1.6;
    }
    .noti-message strong { color: #0f172a; font-size: 1.05rem; letter-spacing: -0.01em; }
    
    .noti-time { font-size: 0.75rem; color: #64748b; font-weight: 500; }

    .noti-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
    
    .mark-read-btn {
        background: #3b82f6; color: #ffffff; border: none;
        padding: 7px 16px; border-radius: 12px; font-size: 0.85rem;
        font-weight: 600; cursor: pointer; transition: 0.2s;
    }
    .mark-read-btn:hover {
        background: #2563eb; transform: translateY(-1px);
    }

    .delete-noti-btn {
        background: rgba(248, 113, 113, 0.1); color: #f87171;
        border: none; padding: 7px 12px; border-radius: 12px;
        cursor: pointer; transition: 0.2s;
    }
    .delete-noti-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; transform: scale(1.05); }

    .empty-noti { text-align: center; padding: 40px 20px; color: #64748b; }

    @keyframes shake {
        0%, 100% { transform: rotate(0); }
        20% { transform: rotate(15deg); }
        40% { transform: rotate(-15deg); }
        60% { transform: rotate(10deg); }
        80% { transform: rotate(-10deg); }
    }
    .is-shaking {
        animation: shake 0.5s both;
    }

    /* Hiệu ứng nảy cho badge */
    @keyframes badge-bounce {
        0%, 100% { transform: scale(1); }
        45% { transform: scale(1.4); }
        70% { transform: scale(0.9); }
    }
    .badge-bounce {
        display: flex !important;
        animation: badge-bounce 0.4s ease-out;
    }
`;