const bellStyle = `.admin-notification-bell {
            position: relative;
            cursor: pointer;
            font-size: 1.3rem;
            color: #0f172a;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            background: transparent;
            border: 1px solid #e2e8f0;
        }
        .admin-notification-bell:hover {
            background: #f8fafc;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        
        /* Rung khi hover HOẶC khi có class is-shaking */
        .admin-notification-bell:hover i,
        .admin-notification-bell.is-shaking i {
            animation: bell-shake 0.5s ease-in-out;
        }
        .bell-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: #0f172a;
            font-size: 10px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #f8fafc;
            box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }
        .bell-badge.bounce {
            animation: badge-bounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes badge-bounce {
            0% { transform: scale(1); }
            50% { transform: scale(1.4); }
            100% { transform: scale(1); }
        }

        @keyframes bell-shake {
            0% { transform: rotate(0); }
            15% { transform: rotate(15deg); }
            30% { transform: rotate(-15deg); }
            45% { transform: rotate(10deg); }
            60% { transform: rotate(-10deg); }
            75% { transform: rotate(5deg); }
            85% { transform: rotate(-5deg); }
            100% { transform: rotate(0); }
        }

        .admin-notification-dropdown {
            position: absolute;
            top: calc(100% + 12px);
            right: 0;
            width: 320px;
            background: #f1f5f9; /* Slate 100 */
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            z-index: 99999;
            display: none;
            overflow: hidden;
            cursor: default;
        }
        .admin-notification-dropdown.active { display: block; animation: slideDown 0.2s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .notification-header { padding: 12px 16px; font-weight: 700; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .notification-list { list-style: none; padding: 0; margin: 0; max-height: 350px; overflow-y: auto;height:250px }
        .notification-item { 
            padding: 12px 16px; 
            border-bottom: 1px solid #e2e8f0; 
            transition: background 0.2s; 
            cursor: pointer;
        }
        .notification-item:hover { background: #e2e8f0; }
        .notification-item:last-child { border-bottom: none; }
        .notification-item.unread { background: #eff6ff; }
        .notification-item strong { display: block; font-size: 13px; color: #1e293b; margin-bottom: 2px; }
        .notification-item p { font-size: 12px; color: #64748b; margin: 0; line-height: 1.4; }
        .notification-item .time { font-size: 10px; color: #475569; margin-top: 4px; display: block; }
        
        .empty-notification { padding: 30px 16px; text-align: center; color: #475569; font-size: 13px; }
        .notification-footer { 
            padding: 10px; 
            text-align: center; 
            font-size: 12px; 
            font-weight: 600; 
            color: #2563eb; 
            background: #f8fafc; 
            border-top: 1px solid #e2e8f0;
            cursor: pointer;
        }
        .notification-footer:hover { background: #eff6ff; text-decoration: underline; }

        /* Ẩn badge nếu không có thông báo */
        .bell-badge:empty, .bell-badge[data-count="0"] { display: none; }
        .notification-item.unread {
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
}
.notification-item.unread strong {
    color: #3b82f6;
}`;

const tableStyle = ` @keyframes fadeInOut { 0% { opacity: 0; transform: translateX(-50%) translateY(-10px); } 15% { opacity: 1; transform: translateX(-50%) translateY(0); } 85% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); } }
        .admin-header { position: relative; z-index: 10002; }
        .admin-table { position: relative; }
        .table-loading-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(226, 232, 240, 0.35); /* Slate 200 trong suốt hơn */
            backdrop-filter: blur(10px); /* Tăng độ mờ kính */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: inherit;
            overflow: hidden;
        }

        .table-loading-overlay::after {
            content: "";
            position: absolute;
            top: 0; left: -150%; width: 300%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.06), transparent);
            animation: shimmer-swipe 2s infinite linear;
        }

        @keyframes shimmer-swipe {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(50%); }
        }

        .table-loading-overlay.active { opacity: 1; visibility: visible; }

        .table-loading-overlay i { 
            font-size: 2.2rem; 
            color: #2563eb; 
            filter: drop-shadow(0 0 10px rgba(37, 99, 235, 0.3));
            animation: modern-spin-pulse 1.8s infinite ease-in-out;
        }

        @keyframes modern-spin-pulse {
            0% { transform: rotate(0deg) scale(0.85); opacity: 0.7; }
            50% { transform: rotate(180deg) scale(1.15); opacity: 1; }
            100% { transform: rotate(360deg) scale(0.85); opacity: 0.7; }
        }`;

export const dishManageStyle = bellStyle + tableStyle;
