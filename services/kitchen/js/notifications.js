// services/kitchen/notifications.js
import { client, databases, DATABASE_ID } from "../../shared/js/appwrite.js";
import { notificationStyle } from "../styles/notification.js";
import { formatDateTime, escapeHtml } from "./utils.js";

const NOTIF_STORAGE_KEY = 'foodu_kitchen_notifications';
const NOTIF_UNREAD_COUNT_KEY = 'foodu_kitchen_unread_count';

// ========== CSS nội bộ ==========
let stylesInjected = false;
function injectNotificationStyles() {
    if (stylesInjected) return;
    const style = document.createElement('style');
    style.textContent = notificationStyle;
    document.head.appendChild(style);
    stylesInjected = true;
}

// ========== LocalStorage helpers ==========
function saveNotifications(notifications) {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
}
function loadNotifications() {
    const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
    try {
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
}
function saveUnreadCount(count) {
    localStorage.setItem(NOTIF_UNREAD_COUNT_KEY, count);
}
function loadUnreadCount() {
    const stored = localStorage.getItem(NOTIF_UNREAD_COUNT_KEY);
    return stored ? parseInt(stored, 10) : 0;
}
function setUnreadCount(count) {
    saveUnreadCount(count);
    const badge = document.getElementById('notification-badge');
    if (badge) {
        badge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}
function incrementUnreadCount() { setUnreadCount(loadUnreadCount() + 1); }
function decrementUnreadCount(amount = 1) { setUnreadCount(Math.max(0, loadUnreadCount() - amount)); }

function renderNotifications(notifications, listEl) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!notifications.length) {
        listEl.innerHTML = '<div class="empty-noti">Chưa có thông báo nào</div>';
        return;
    }
    notifications.forEach(n => {
        const div = document.createElement('div');
        div.className = `notification-item ${n.isUnread ? 'unread' : 'read'}`;
        div.dataset.id = n.id;
        if (n.orderId) div.dataset.orderId = n.orderId;
        div.innerHTML = `
            <div class="noti-message"><strong>${escapeHtml(n.title)}</strong><br>${escapeHtml(n.message)}</div>
            <div class="noti-time">${escapeHtml(n.time)}</div>
            <div class="noti-actions">
                ${n.isUnread ? '<button class="mark-read-btn">Đã đọc</button>' : ''}
                <button class="delete-noti-btn" title="Xóa thông báo">🗑️</button>
            </div>
        `;
        listEl.appendChild(div);
    });
}

// Xóa một thông báo theo id
export function deleteNotificationById(notifId) {
    let notifications = loadNotifications();
    const notif = notifications.find(n => n.id === notifId);
    if (!notif) return false;
    const wasUnread = notif.isUnread;
    notifications = notifications.filter(n => n.id !== notifId);
    saveNotifications(notifications);
    if (wasUnread) decrementUnreadCount();
    // Cập nhật modal nếu đang mở
    const modalBody = document.querySelector('.notifications-modal .modal-body');
    if (modalBody) {
        const listContainer = modalBody.querySelector('.notifications-list');
        if (listContainer) renderNotifications(notifications, listContainer);
    }
    return true;
}

// Xóa tất cả thông báo
export function deleteAllNotifications() {
    saveNotifications([]);
    setUnreadCount(0);
    const modalBody = document.querySelector('.notifications-modal .modal-body');
    if (modalBody) {
        const listContainer = modalBody.querySelector('.notifications-list');
        if (listContainer) renderNotifications([], listContainer);
    }
}

export function addNotification({ title, message, time, isUnread = true, orderId = null }) {
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const newNotif = { id, title, message, time, isUnread, createdAt: new Date().toISOString(), orderId };
    let notifications = loadNotifications();
    notifications.unshift(newNotif);
    if (notifications.length > 50) notifications.pop();
    saveNotifications(notifications);

    const modalBody = document.querySelector('.notifications-modal .modal-body');
    if (modalBody) {
        let listContainer = modalBody.querySelector('.notifications-list');
        if (!listContainer) {
            listContainer = document.createElement('div');
            listContainer.className = 'notifications-list';
            modalBody.innerHTML = '';
            modalBody.appendChild(listContainer);
        }
        renderNotifications(notifications, listContainer);
    }

    if (isUnread) incrementUnreadCount();
    const bell = document.getElementById('notificationBell');
    const badge = document.getElementById('notification-badge');

    if (badge) {
        badge.classList.remove('badge-bounce');
        void badge.offsetWidth;
        badge.classList.add('badge-bounce');
    }

    if (bell) {
        bell.classList.remove('is-shaking');
        void bell.offsetWidth;
        bell.classList.add('is-shaking');
        setTimeout(() => bell.classList.remove('is-shaking'), 500);
    }
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.6;
        audio.play().catch(e => console.warn("Audio blocked"));
    } catch(err) {}
}

export function markAsReadById(notifId) {
    let notifications = loadNotifications();
    const notif = notifications.find(n => n.id === notifId);
    if (notif && notif.isUnread) {
        notif.isUnread = false;
        saveNotifications(notifications);
        decrementUnreadCount();
        const modalBody = document.querySelector('.notifications-modal .modal-body');
        if (modalBody) {
            const listContainer = modalBody.querySelector('.notifications-list');
            if (listContainer) renderNotifications(notifications, listContainer);
        }
        return true;
    }
    return false;
}

export function markAllAsRead() {
    let notifications = loadNotifications();
    const unreadCountBefore = notifications.filter(n => n.isUnread).length;
    if (unreadCountBefore === 0) return;
    notifications = notifications.map(n => ({ ...n, isUnread: false }));
    saveNotifications(notifications);
    setUnreadCount(0);
    const modalBody = document.querySelector('.notifications-modal .modal-body');
    if (modalBody) {
        const listContainer = modalBody.querySelector('.notifications-list');
        if (listContainer) renderNotifications(notifications, listContainer);
    }
}

export function showNotificationsModal() {
    const existingModal = document.querySelector('.notifications-modal');
    if (existingModal) { existingModal.remove(); return; }
    const notifications = loadNotifications();
    const modal = document.createElement('div');
    modal.className = 'notifications-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-container">
            <div class="modal-header">
                <h3>🔔 Thông báo</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; gap: 10px; margin-bottom: 18px;">
                    <button class="mark-all-read-btn" style="flex:1;">📖 Đánh dấu đã đọc tất cả</button>
                    <button class="delete-all-btn" style="flex:1; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.5); color: #fca5a5;">🗑️ Xóa tất cả</button>
                </div>
                <div class="notifications-list"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const listContainer = modal.querySelector('.notifications-list');
    renderNotifications(notifications, listContainer);
    modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.mark-all-read-btn')?.addEventListener('click', () => {
        markAllAsRead();
        renderNotifications(loadNotifications(), listContainer);
    });
    modal.querySelector('.delete-all-btn')?.addEventListener('click', () => {
        if (confirm('Xóa tất cả thông báo?')) {
            deleteAllNotifications();
            renderNotifications([], listContainer);
        }
    });
    listContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.mark-read-btn');
        const deleteBtn = e.target.closest('.delete-noti-btn');
        if (btn) {
            const notiDiv = btn.closest('.notification-item');
            const notifId = notiDiv.dataset.id;
            if (notifId) {
                markAsReadById(notifId);
                renderNotifications(loadNotifications(), listContainer);
            }
        } else if (deleteBtn) {
            const notiDiv = deleteBtn.closest('.notification-item');
            const notifId = notiDiv.dataset.id;
            if (notifId && confirm('Xóa thông báo này?')) {
                deleteNotificationById(notifId);
                renderNotifications(loadNotifications(), listContainer);
            }
        }
    });
}

export function initNotifications() {
    injectNotificationStyles();
    const notifications = loadNotifications();
    const unreadCount = notifications.filter(n => n.isUnread).length;
    setUnreadCount(unreadCount);
}

// CHỈ LẮNG NGHE THÔNG BÁO TỪ ADMIN (role = 'kitchen')
export function initRealtimeNotifications() {
    if (!client || !DATABASE_ID) {
        console.warn("Realtime notifications not available");
        return;
    }
    client.subscribe(
        `databases.${DATABASE_ID}.collections.notifications.documents`,
        (response) => {
            if (response.events.some(e => e.includes('.create'))) {
                const notif = response.payload;
                if (notif && notif.role === 'kitchen') {
                    const displayTime = notif.createdAt ? formatDateTime(notif.createdAt) : 'Vừa xong';
                    addNotification({
                        title: notif.title || '🔔 Thông báo mới',
                        message: notif.message || '',
                        time: displayTime,
                        orderId: notif.orderId || null
                    });
                }
            }
        }
    );
}