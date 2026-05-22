// services/admin/features/notifications.js
import { client, databases, DATABASE_ID } from "../../../shared/js/appwrite.js";
import { DB } from "../../../shared/js/config.js";
import { STATUS } from "../../../shared/js/utils.js";

const NOTIF_STORAGE_KEY = 'foodu_admin_notifications';
const NOTIF_UNREAD_COUNT_KEY = 'foodu_admin_unread_count';

function escapeHtml(value) {
    if (!value) return '';
    return String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
}

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

function updateBadgeDisplay(badge, count) {
    if (!badge) return;
    badge.textContent = count > 0 ? (count > 9 ? '9+' : count) : '';
    badge.setAttribute('data-count', count);
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function setUnreadCount(count) {
    saveUnreadCount(count);
    const badge = document.querySelector('#admin-bell-badge');
    updateBadgeDisplay(badge, count);
}

function incrementUnreadCount() {
    setUnreadCount(loadUnreadCount() + 1);
}

function decrementUnreadCount(amount = 1) {
    let current = loadUnreadCount();
    setUnreadCount(Math.max(0, current - amount));
}

function renderNotifications(notifications, listEl) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!notifications.length) {
        listEl.innerHTML = '<div class="empty-notification">Chưa có thông báo nào</div>';
        return;
    }
    notifications.forEach(notif => {
        const li = document.createElement('li');
        li.className = `notification-item ${notif.isUnread ? 'unread' : ''}`;
        li.dataset.id = notif.id;
        if (notif.orderId) li.dataset.orderId = notif.orderId;
        li.innerHTML = `
            <strong>${escapeHtml(notif.title)}</strong>
            <p>${escapeHtml(notif.message)}</p>
            <span class="time">${escapeHtml(notif.time)}</span>
        `;
        listEl.appendChild(li);
    });
}

function markAllAsRead(listEl) {
    let notifications = loadNotifications();
    let unreadCountBefore = notifications.filter(n => n.isUnread).length;
    if (unreadCountBefore === 0) return;
    notifications = notifications.map(n => ({ ...n, isUnread: false }));
    saveNotifications(notifications);
    renderNotifications(notifications, listEl);
    setUnreadCount(0);
}

function markAsReadById(notifId, listEl) {
    let notifications = loadNotifications();
    const notif = notifications.find(n => n.id === notifId);
    if (notif && notif.isUnread) {
        notif.isUnread = false;
        saveNotifications(notifications);
        renderNotifications(notifications, listEl);
        decrementUnreadCount();
    }
}

export function initNotifications(root) {
    const bell = root.querySelector('#adminNotificationBell');
    const dropdown = root.querySelector('#adminNotificationDropdown');
    const badge = root.querySelector('#admin-bell-badge');
    const listEl = root.querySelector('#adminNotificationList');

    if (!bell || !dropdown || !listEl) return;

    function addNotification({ title, message, time, isUnread = true, orderId = null }) {
        const id = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        const newNotif = { id, title, message, time, isUnread, createdAt: new Date().toISOString(), orderId };
        let notifications = loadNotifications();
        notifications.unshift(newNotif);
        if (notifications.length > 20) notifications.pop();
        saveNotifications(notifications);
        renderNotifications(notifications, listEl);
        
        if (isUnread) incrementUnreadCount();
        
        bell.classList.remove('is-shaking');
        void bell.offsetWidth;
        bell.classList.add('is-shaking');
        setTimeout(() => bell.classList.remove('is-shaking'), 500);
        
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.6;
            audio.play().catch(e => console.warn("Audio blocked"));
        } catch(err) {}
    }

    window.addNotification = addNotification;

    // Migration: xóa thông báo cũ không có orderId
    let notifications = loadNotifications();
    const oldLen = notifications.length;
    notifications = notifications.filter(n => n.orderId !== undefined);
    if (notifications.length !== oldLen) {
        console.log(`🧹 Đã xóa ${oldLen - notifications.length} thông báo cũ thiếu orderId`);
        saveNotifications(notifications);
    }
    renderNotifications(notifications, listEl);
    updateBadgeDisplay(badge, loadUnreadCount());

    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        if (dropdown.classList.contains('active')) markAllAsRead(listEl);
    });

    document.addEventListener('click', (e) => {
        if (dropdown.classList.contains('active') && !bell.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    listEl.addEventListener('click', (e) => {
        const li = e.target.closest('.notification-item');
        if (li && li.dataset.id) {
            const orderId = li.dataset.orderId;
            console.log('🔔 Click notification', { id: li.dataset.id, orderId });
            console.log('window.openOrderDetail type:', typeof window.openOrderDetail);
            
            markAsReadById(li.dataset.id, listEl);
            
            if (orderId && typeof window.openOrderDetail === 'function') {
                dropdown.classList.remove('active');
                window.openOrderDetail(orderId);
            } else {
                console.warn('⚠️ Cannot open order detail', { orderId, hasFunc: typeof window.openOrderDetail });
            }
        }
    });
}

export function initRealtimeNotifications() {
    if (!client || !DATABASE_ID) return;
    
    console.log("📡 Admin Realtime Notifications initialized...");

    const lastKitchenNoteByOrderId = new Map();

    client.subscribe(
        `databases.${DATABASE_ID}.collections.${DB.COLLECTIONS.ORDERS || 'orders'}.documents`,
        (response) => {
            const order = response.payload;
            const isCreate = response.events.some(e => e.includes('.create') || e.includes('documents.create'));
            const isUpdate = response.events.some(e => e.includes('.update') || e.includes('documents.update'));

            if (typeof window.addNotification !== 'function') return;

            if (isUpdate && order?.$id) {
                console.log("Admin realtime order update", {
                    id: order.$id,
                    status: order.status,
                    kitchenNote: order.kitchenNote,
                    events: response.events,
                });
            }

            if (isCreate) {
                lastKitchenNoteByOrderId.set(order.$id, order.kitchenNote || "");
                console.log("📦 New order received:", order.$id);
                window.addNotification({
                    title: "🛎️ Đơn hàng mới",
                    message: `Khách ${order.customerName || 'Ẩn danh'} vừa đặt món. Mã: ${order.$id.slice(-6)}`,
                    // Sử dụng orderDate vì phía Customer gửi lên tên này, hoặc dùng $createdAt của Appwrite
                    time: new Date(order.orderDate || order.$createdAt).toLocaleString('vi-VN'),
                    orderId: order.$id
                });
            } else if (isUpdate && order.status === STATUS.STEP_4) {
                lastKitchenNoteByOrderId.set(order.$id, order.kitchenNote || "");
                // Thông báo khi Bếp hoàn thành món ăn
                console.log("✅ Order completed by kitchen:", order.$id);
                window.addNotification({
                    title: "✅ Món ăn đã sẵn sàng",
                    message: `Bếp đã nấu xong đơn #${order.$id.slice(-6)} của ${order.customerName || 'Khách'}.`,
                    time: new Date().toLocaleString('vi-VN'),
                    orderId: order.$id
                });
            } else if (isUpdate) {
                const currentNote = (order.kitchenNote || "").trim();
                const previousNote = (lastKitchenNoteByOrderId.get(order.$id) || "").trim();
                lastKitchenNoteByOrderId.set(order.$id, currentNote);

                if (currentNote && currentNote !== previousNote) {
                    window.addNotification({
                        title: "⚠️ Bếp báo thiếu món",
                        message: `Đơn #${order.$id.slice(-6)} (${order.customerName || "Khách"}): "${currentNote}"`,
                        time: new Date().toLocaleString('vi-VN'),
                        orderId: order.$id
                    });
                }
            }
        }
    );

    // Lắng nghe báo cáo lỗi/thiếu món từ Bếp
    return;

    client.subscribe(
        `databases.${DATABASE_ID}.collections.${DB.COLLECTIONS.NOTIFICATIONS || 'notifications'}.documents`,
        (response) => {
            // Kiểm tra sự kiện tạo mới thông báo
            const isCreate = response.events.some(e => e.includes('.create') || e.includes('documents.create'));
            
            if (isCreate) {
                const notif = response.payload;
                console.log("🔔 Received notification document:", notif);

                if (notif && notif.role === 'admin') {
                    window.addNotification({
                        title: notif.title || "⚠️ Thông báo từ Bếp",
                        message: notif.message || "",
                        time: new Date().toLocaleString('vi-VN'),
                        orderId: notif.orderId || null
                    });
                }
            }
        }
    );
}
