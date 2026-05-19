// services/kitchen/kitchen-styles.js
export const kitchenStyles = `
/* Modern Kitchen Styles - Glassmorphism + Smooth Animations */
:root {
    --primary: #3b82f6;
    --primary-glow: rgba(59, 130, 246, 0.4);
    --success: #10b981;
    --success-glow: rgba(16, 185, 129, 0.3);
    --warning: #f59e0b;
    --danger: #ef4444;
    --dark-bg: #f8fafc;
    --card-bg: rgba(255, 255, 255, 0.96);
    --border-light: rgba(148, 163, 184, 0.16);
    --text-primary: #0f172a;
    --text-secondary: #64748b;
}

    background: rgba(148, 163, 184, 0.1);
    color: #475569;
    box-sizing: border-box;
}

    background: rgba(248, 250, 252, 0.96);
    background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.06), transparent 24%), linear-gradient(180deg, #ffffff, #f8fbff);
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
}

/* Animated background effect */
.kitchen-shell::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    color: #475569;
    height: 100%;
    background: radial-gradient(circle at 70% 40%, rgba(59,130,246,0.05) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
}

/* Dashboard Header */
    background: rgba(59, 130, 246, 0.08);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border-light);
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    border-top: 1px dashed rgba(148, 163, 184, 0.16);
    position: sticky;
    top: 0;
    color: var(--text-primary);
    transition: all 0.3s ease;
}

.dashboard-brand h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
}
    color: #b91c1c;
.dashboard-brand p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

/* User & Actions */
.user-chip {
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.16);
    padding: 0.5rem 1.2rem;
    border-radius: 40px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.96);
    color: var(--text-primary);
    border: 1px solid var(--border-light);

.ghost-button {
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid var(--border-light);
    color: var(--text-primary);
    color: #ffffff;
    padding: 0.5rem 1.2rem;
    border-radius: 40px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s ease;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.22);
    color: #b91c1c;
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.22);
    color: var(--primary);
    background: rgba(239, 68, 68, 0.14);
}

.ghost-button.is-overloaded {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.28);
    color: #b91c1c;
    background: rgba(255, 255, 255, 0.96);

.ghost-button.is-overloaded:hover {
    background: rgba(239, 68, 68, 0.14);
    border-color: rgba(239, 68, 68, 0.38);
    color: #991b1b;
}

/* Main Content */
.dashboard-main {
    max-width: 1440px;
    margin: 0 auto;
    color: #ffffff;
    position: relative;
    z-index: 2;
}

/* Tabs - Modern Underline */
    background: #e2e8f0;
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 60px;
    padding: 0.25rem;
    width: fit-content;
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-light);
}

.kitchen-tab {
    background: transparent;
    border: none;
    padding: 0.65rem 1.8rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 40px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.kitchen-tab i {
    font-size: 1rem;
}

.kitchen-tab:hover {
    color: var(--text-primary);
    background: rgba(59, 130, 246, 0.08);
}

.kitchen-tab.active {
    background: var(--primary);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Orders Grid */
.kitchen-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 1.75rem;
    animation: fadeInUp 0.4s ease;
}

/* Kitchen Card - Glassmorph + Hover 3D */
.kitchen-card {
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-light);
    border-radius: 28px;
    padding: 1.5rem;
    transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.kitchen-card:hover {
    transform: translateY(-6px) scale(1.01);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.2);
}

/* Card Header */
.kitchen-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-light);
}

.order-id {
    font-size: 1rem;
    font-weight: 700;
    background: linear-gradient(120deg, #a5b4fc, #60a5fa);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    letter-spacing: -0.2px;
}

.order-time {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-left: 12px;
}

.order-status {
    font-size: 0.7rem;
    padding: 0.25rem 1rem;
    border-radius: 40px;
    font-weight: 600;
    background: rgba(148, 163, 184, 0.16);
    color: #cbd5e1;
    backdrop-filter: blur(4px);
}

/* Status colors (match shared STATUS values) */
.order-status.pending {
    background: rgba(245, 158, 11, 0.20);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.35);
}

.order-status.confirmed {
    background: rgba(59, 130, 246, 0.18);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.35);
}

.order-status.processing {
    background: rgba(168, 85, 247, 0.18);
    color: #d8b4fe;
    border: 1px solid rgba(168, 85, 247, 0.35);
}

.order-status.completed {
    background: rgba(16, 185, 129, 0.18);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.35);
}

.order-status.cancelled {
    background: rgba(239, 68, 68, 0.18);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.35);
}

/* Backward-compat alias (if any older code uses this class) */
.order-status.in_kitchen {
    background: rgba(16, 185, 129, 0.18);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.35);
}

/* Customer Info */
.customer-info {
    background: rgba(0, 0, 0, 0.35);
    border-radius: 20px;
    padding: 0.85rem 1rem;
    margin-bottom: 1.25rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.customer-info i {
    width: 24px;
    color: var(--primary);
}

/* Items */
.order-items {
    margin: 1rem 0;
}

.items-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
    letter-spacing: 0.3px;
}

.order-items ul {
    list-style: none;
    padding-left: 0;
}

.order-items li {
    font-size: 0.8rem;
    color: #cbd5e1;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
}

.combo-item {
    background: rgba(59, 130, 246, 0.1);
    border-radius: 16px;
    padding: 0.5rem 0.75rem;
    margin: 0.5rem 0;
}

.combo-item ul {
    margin-left: 1.25rem;
    margin-top: 0.4rem;
}

.order-total {
    text-align: right;
    padding-top: 0.75rem;
    border-top: 1px dashed rgba(255, 255, 255, 0.15);
    font-size: 1rem;
    font-weight: 700;
    color: #facc15;
}

/* Kitchen Note */
.kitchen-note {
    margin-top: 0.75rem;
    padding: 0.6rem 0.9rem;
    background: rgba(239, 68, 68, 0.15);
    border-left: 3px solid #ef4444;
    border-radius: 12px;
    font-size: 0.75rem;
    color: #fecaca;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Buttons - Modern */
.kitchen-card-footer {
    display: flex;
    gap: 12px;
    margin-top: 1.5rem;
}

.kitchen-card-footer button {
    flex: 1;
    padding: 0.7rem 0;
    border-radius: 40px;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.96);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
}

.btn-start-cooking {
    background: linear-gradient(105deg, #3b82f6, #2563eb);
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

.btn-start-cooking:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.btn-complete {
    background: linear-gradient(105deg, #10b981, #059669);
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
}

.btn-complete:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
}

.btn-report-issue {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #fca5a5;
}

.btn-report-issue:hover {
    background: rgba(239, 68, 68, 0.35);
    transform: translateY(-2px);
}

/* Empty / Loading States */
.empty-state, .loading-state {
    text-align: center;
    padding: 3rem 2rem;
    background: rgba(255, 255, 255, 0.96);
    border-radius: 32px;
    backdrop-filter: blur(8px);
    color: var(--text-secondary);
}

.empty-state i, .loading-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.7;
}

.retry-btn {
    margin-top: 1rem;
    background: var(--primary);
    border: none;
    padding: 0.6rem 1.5rem;
    border-radius: 40px;
    color: #ffffff;
    cursor: pointer;
    font-weight: 500;
}

/* Animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .dashboard-main {
        padding: 1rem;
    }
    .kitchen-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
    }
    .kitchen-tabs {
        width: 100%;
        justify-content: center;
    }
    .kitchen-tab {
        flex: 1;
        justify-content: center;
        padding: 0.5rem 1rem;
    }
    .kitchen-card-footer {
        flex-direction: column;
    }
    .dashboard-topbar {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }
    .dashboard-actions {
        justify-content: center;
    }
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: #e2e8f0;
}
::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
    background: #60a5fa;
}
    // Thêm vào cuối kitchenStyles
.notification-bell {
  position: relative;
  cursor: pointer;
    color: #64748b;
     background: rgba(248, 250, 252, 0.96);
  transition: color 0.2s;
}
.notification-bell:hover {
  color: #60a5fa;
}
.badge {
  position: absolute;
  top: -8px;
  right: -12px;
  background: #ef4444;
    color: #ffffff;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 20px;
  display: none;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
}
.notifications-modal .mark-all-read-btn {
    cursor: pointer;
    transition: 0.2s;
}
.notifications-modal .mark-all-read-btn:hover {
    background: #3b82f6;
    color: #ffffff;
}
.notifications-list {
    max-height: 400px;
    overflow-y: auto;
}
.notification-item {
    margin-bottom: 12px;
    padding: 10px;
    border-radius: 12px;
    background: rgba(248, 250, 252, 0.96);
}
.notification-item.unread {
    background: rgba(59,130,246,0.2);
    border-left: 3px solid #3b82f6;
}
.noti-message {
    font-size: 0.85rem;
    color: #e2e8f0;
}
.noti-time {
    font-size: 0.7rem;
    color: #94a3b8;
    margin-top: 4px;
}
.mark-read-btn {
    margin-top: 6px;
    background: #3b82f6;
    border: none;
    padding: 4px 12px;
    border-radius: 20px;
    color: white;
    font-size: 0.7rem;
    cursor: pointer;
}
.empty-noti {
    text-align: center;
    color: #94a3b8;
    padding: 20px;
}
@keyframes shake {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(10deg); }
    50% { transform: rotate(-10deg); }
    75% { transform: rotate(5deg); }
    100% { transform: rotate(0deg); }
}
.is-shaking {
    animation: shake 0.3s ease-in-out;
}
`;
