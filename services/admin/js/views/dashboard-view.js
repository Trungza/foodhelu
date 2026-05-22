import { renderStats } from "../renderers/stats.js";
import { renderOrdersTable } from "../renderers/orders-table.js";
import { renderMenuManager } from "../renderers/menu-manager.js";
import { renderGalleryManager } from "../features/gallery-manager.js";
import { renderMealSchedule } from "../renderers/meal-schedule.js";
import { renderRevenueStats } from "../renderers/revenue-stats.js";
import {
  renderOrderModal,
  renderAddDishModal,
} from "../renderers/modals.js";
import { initTabs } from "../features/tabs.js";
import { initOrderDetailEvents } from "../features/order-detail.js";
import { initMenuManagerEvents } from "../features/dish-manager.js";
import { initGalleryManagerEvents } from "../features/gallery-manager.js";
import { initMealScheduleTabs, resetMealScheduleCache } from "../features/meal-schedule-tabs.js";
import { initTodayDishTracker } from "../features/today-dish-tracker.js";
import { initRevenueStatsFeature } from "../features/revenue-stats.js";
import {
  initNotifications,
  initRealtimeNotifications,
} from "../features/notifications.js";
import { client, databases, DATABASE_ID } from "../../../shared/js/appwrite.js";
import { showToast } from "../../../shared/components/toast.js";
import { showConfirmDialog } from "../../../shared/components/dialog.js";
import { STATUS, escapeHtml } from "../../../shared/js/utils.js";
import { formatCurrency } from "../core/formatters.js";
import {
  getSystemSettings,
  setSystemSettings,
  subscribeSystemSettings,
} from "../../../shared/js/system-settings.js";
import { DB } from "../../../shared/js/config.js";

window.showToast = showToast;
window.showConfirmDialog = showConfirmDialog;

const ADMIN_STYLES = `
<style>
    :root {
        --admin-primary: #4f46e5;
        --admin-primary-hover: #4338ca;
        --admin-bg: #f8fafc;
        --admin-card-bg: #ffffff;
        --admin-text-main: #1e293b;
        --admin-text-muted: #64748b;
        --admin-border: #e2e8f0;
        --admin-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }

    .dashboard-shell {
        background-color: var(--admin-bg);
        min-height: 100vh;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: var(--admin-text-main);
    }

    .admin-header {
        background: var(--admin-card-bg);
        padding: 1.25rem 2rem;
        border-bottom: 1px solid var(--admin-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 50;
    }

    .admin-header h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--admin-primary);
        margin: 0;
    }

    .admin-header p {
        font-size: 0.875rem;
        color: var(--admin-text-muted);
        margin: 0;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .admin-tabs-shell {
        background: var(--admin-card-bg);
        padding: 0 2rem;
        border-bottom: 1px solid var(--admin-border);
    }

    .admin-tabs {
        display: flex;
        gap: 2rem;
    }

    .tab-btn {
        padding: 1rem 0;
        font-weight: 600;
        color: var(--admin-text-muted);
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        background: none;
        border-top: none; border-left: none; border-right: none;
        cursor: pointer;
    }

    .tab-btn:hover { color: var(--admin-primary); }

    .tab-btn.active {
        color: var(--admin-primary);
        border-bottom-color: var(--admin-primary);
    }

    .tab-content { padding: 2rem; }

    .stat-card {
        background: var(--admin-card-bg);
        padding: 1.5rem;
        border-radius: 1rem;
        border: 1px solid var(--admin-border);
        box-shadow: var(--admin-shadow);
        transition: transform 0.2s;
    }

    .stat-card:hover { transform: translateY(-2px); }

    .logout-btn {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        transition: all 0.2s;
        cursor: pointer;
    }

    .user-chip {
        background: #f1f5f9;
        padding: 0.4rem 0.8rem;
        border-radius: 2rem;
        font-size: 0.875rem;
        font-weight: 600;
    }

    /* Status Badges */
    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
    }
    .badge.pending { background: #fef3c7; color: #92400e; }
    .badge.confirmed { background: #dbeafe; color: #1e40af; }
    .badge.completed { background: #dcfce7; color: #166534; }

    /* Notification Bell Styles */
    .admin-notification-bell {
        position: relative;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--admin-text-muted);
        padding: 0.5rem;
        transition: color 0.2s;
    }
    .admin-notification-bell:hover { color: var(--admin-primary); }
    .bell-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: #ef4444;
        color: white;
        font-size: 0.65rem;
        padding: 2px 5px;
        border-radius: 999px;
        border: 2px solid white;
    }
    .notification-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        width: 300px;
        background: white;
        border-radius: 0.75rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--admin-border);
        display: none;
        margin-top: 0.5rem;
        overflow: hidden;
    }
    .notification-dropdown.active { display: block; }
</style>
`;

function renderHeader(user) {
  return `
    <header class="admin-header">
      <div>
        <h1>Helu Food Admin</h1>
        <p>Chào ngày mới, quản trị viên!</p>
      </div>
      <div class="header-right">
        <button id="acceptOrdersBtn" class="logout-btn"></button>
        <div class="admin-notification-bell" id="adminNotificationBell">
          <i class="fas fa-bell"></i>
          <span class="bell-badge" id="admin-bell-badge">0</span>
          <div class="notification-dropdown" id="adminNotificationDropdown">
            <div style="padding: 1rem; font-weight: 700; border-bottom: 1px solid var(--admin-border);">Thông báo mới</div>
            <ul id="adminNotificationList" style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">
                <li style="padding: 1rem; text-align: center; color: var(--admin-text-muted);">Không có thông báo mới</li>
            </ul>
          </div>
        </div>
        <span class="user-chip">${user.name || user.email}</span>
        <button id="logoutBtn" class="logout-btn" style="background: #fee2e2; color: #991b1b; border: none;">Đăng xuất</button>
      </div>
    </header>
  `;
}

function renderTabs() {
  return `
    <div class="admin-tabs-shell">
      <div class="admin-tabs">
        <button class="tab-btn active" data-tab="overview"><i class="fas fa-chart-pie"></i> Tổng quan</button>
        <button class="tab-btn" data-tab="orders"><i class="fas fa-shopping-bag"></i> Đơn hàng</button>
        <button class="tab-btn" data-tab="stats"><i class="fas fa-file-invoice-dollar"></i> Doanh thu</button>
        <button class="tab-btn" data-tab="menu"><i class="fas fa-utensils"></i> Thực đơn</button>
        <button class="tab-btn" data-tab="gallery"><i class="fas fa-images"></i> Thư viện</button>
        <button class="tab-btn" data-tab="schedule"><i class="fas fa-calendar-alt"></i> Lịch ăn</button>
      </div>
    </div>
  `;
}

function buildPrintHtml(order) {
  let items = [];
  try {
    items = JSON.parse(order.items) || [];
  } catch (e) {
    items = [];
  }

  const formatDateTime = (value) => {
    if (!value) return "Giao ngay";
    try {
      return new Date(value).toLocaleString("vi-VN");
    } catch {
      return "Không xác định";
    }
  };

  const rowsHtml = items
    .map((item) => {
      const name = escapeHtml(item?.name || "");
      const qty = Number(item?.quantity || 0);
      const price = Number(item?.price || 0);
      const subtotal = qty * price;

      const comboHtml = item?.isCombo && Array.isArray(item?.comboItems)
        ? `<div class="combo-items">
            <strong>Combo:</strong>
            <ul>
              ${item.comboItems
                .map((ci) => {
                  const cName = escapeHtml(ci?.name || "");
                  const cQty = Number(ci?.qtyPerCombo || 0);
                  return `<li>${cName} x ${cQty}</li>`;
                })
                .join("")}
            </ul>
          </div>`
        : "";

      const noteHtml = item?.note
        ? `<div class="item-note">Ghi chú: ${escapeHtml(String(item.note))}</div>`
        : "";

      return `
        <tr>
          <td>
            <div class="item-name">${name}</div>
            ${comboHtml}
            ${noteHtml}
          </td>
          <td class="text-right">${qty}</td>
          <td class="text-right">${formatCurrency(price)}</td>
          <td class="text-right">${formatCurrency(subtotal)}</td>
        </tr>
      `;
    })
    .join("");

  const orderIdShort = order.$id ? order.$id.slice(-8) : "";
  const totalAmount = formatCurrency(Number(order.totalAmount || 0));

  const paymentText = order.paymentMethod === 'qr' ? 'Chuyển khoản QR' : 'Tiền mặt';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>In đơn hàng #${escapeHtml(orderIdShort)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 12px; }
          .meta { margin-bottom: 16px; font-size: 13px; }
          .meta div { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
          th { text-align: left; font-size: 13px; background: #f8fafc; }
          .text-right { text-align: right; white-space: nowrap; }
          .item-name { font-weight: 600; }
          .combo-items ul { margin: 6px 0 0 16px; padding: 0; }
          .combo-items li { margin: 2px 0; }
          .item-note { margin-top: 6px; font-size: 12px; color: #475569; }
          .total { margin-top: 12px; text-align: right; font-size: 16px; font-weight: 700; }
          .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>Đơn hàng #${escapeHtml(orderIdShort)}</h1>
        <div class="meta">
          <div>Khách hàng: ${escapeHtml(order.customerName || "")}</div>
          <div>SĐT: ${escapeHtml(order.customerPhone || "")}</div>
          <div>Địa chỉ: ${escapeHtml(order.customerAddress || "")}</div>
          <div>Ngày đặt: ${formatDateTime(order.orderDate)}</div>
          <div>Hẹn giờ giao: ${formatDateTime(order.deliveryTime)}</div>
          <div style="font-weight: bold; color: #4f46e5;">Thanh toán: ${paymentText}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Món</th>
              <th class="text-right">SL</th>
              <th class="text-right">Giá</th>
              <th class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || "<tr><td colspan=\"4\">Không có dữ liệu</td></tr>"}
          </tbody>
        </table>
        <div class="total">Tổng cộng: ${totalAmount}</div>
        <div class="footer">Cảm ơn quý khách!</div>
      </body>
    </html>
  `;
}

async function renderPanels() {
  const ordersTableHtml = await renderOrdersTable();
  const revenueStatsHtml = await renderRevenueStats();
  return `
    <main class="tab-content">
      <section class="tab-panel active" id="overview">${await renderStats()}</section>
      <section class="tab-panel" id="orders">${ordersTableHtml}</section>
      <section class="tab-panel" id="stats">${revenueStatsHtml}</section>
      <section class="tab-panel" id="menu">${await renderMenuManager()}</section>
      <section class="tab-panel" id="gallery">${await renderGalleryManager()}</section>
      <section class="tab-panel" id="schedule">${await renderMealSchedule()}</section>
    </main>
  `;
}

function attachOrdersEvents(app) {
  const ordersTable = app.querySelector(".data-table");
  
  if (!ordersTable) return;

  const handler = async (e) => {
    const sendBtn = e.target.closest(".send-kitchen");
    const cancelBtn = e.target.closest(".cancel-order");
    const printBtn = e.target.closest(".print-order");
    const row = e.target.closest(".order-row-clickable");

    if (sendBtn) {

      e.stopPropagation();
      const orderId = sendBtn.getAttribute("data-id");
      const confirmed = await showConfirmDialog({
        title: "Xác nhận gửi đơn",
        message: "Bạn có chắc chắn muốn gửi đơn hàng này xuống bếp?",
        confirmText: "Gửi",
        cancelText: "Hủy",
        confirmType: "primary",
      });
      if (!confirmed) return;
      try {
        // 1. Lấy thông tin đơn để lấy tên khách hàng
        const order = await databases.getDocument(DATABASE_ID, "orders", orderId);
        
        // 2. Cập nhật trạng thái đơn hàng
        await databases.updateDocument(DATABASE_ID, "orders", orderId, { 
            status: STATUS.STEP_2,
        });

        // 3. Tạo thông báo cho bếp
        try {
          const nowIso = new Date().toISOString();
          await databases.createDocument(DATABASE_ID, DB.COLLECTIONS.NOTIFICATIONS, "unique()", {
            role: "kitchen",
            title: "🛎️ Đơn hàng mới",
            message: `Đơn #${order.$id.slice(-8)} - ${order.customerName} vừa được gửi xuống bếp.`,
            orderId: order.$id,
            createdAt: nowIso,
            updatedAt: nowIso,
            isUnread: true,
          });
        } catch (notifError) {
          console.warn("Khong tao duoc thong bao cho bep:", notifError);
        }

        window.showToast("Đã gửi đơn xuống bếp!", "success");
        await refreshOrdersTable(app);
      } catch (error) {
        window.showToast("Lỗi: " + error.message, "error");
      }
      return;
    }

    if (cancelBtn) {
      e.stopPropagation();
      const orderId = cancelBtn.getAttribute("data-id");
      const confirmed = await showConfirmDialog({
        title: "Xác nhận hủy đơn",
        message: "Bạn có chắc chắn muốn hủy đơn hàng này?",
        confirmText: "Hủy",
        cancelText: "Quay lại",
        confirmType: "danger",
      });
      if (!confirmed) return;
      try {
        await databases.updateDocument(DATABASE_ID, "orders", orderId, { status: "cancelled" });
        window.showToast("Đã hủy đơn hàng!", "success");
        await refreshOrdersTable(app);
      } catch (error) {
        window.showToast("Lỗi: " + error.message, "error");
      }
      return;
    }

    if (printBtn) {
      e.stopPropagation();
      const orderId = printBtn.getAttribute("data-id");
      try {
        const order = await databases.getDocument(DATABASE_ID, "orders", orderId);
        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) {
          window.showToast("Không thể mở cửa sổ in. Hãy kiểm tra chặn pop-up.", "error");
          return;
        }
        printWindow.document.open();
        printWindow.document.write(buildPrintHtml(order));
        printWindow.document.close();
        printWindow.focus();
        printWindow.onafterprint = () => printWindow.close();
        printWindow.print();
      } catch (error) {
        window.showToast("Lỗi: " + error.message, "error");
      }
      return;
    }

    if (row && !sendBtn && !cancelBtn) {
      const orderId = row.getAttribute("data-order-id");
      if (orderId && window.openOrderDetail) {
        window.openOrderDetail(orderId);
      }
    }
  };

  ordersTable.removeEventListener("click", ordersTable._listener);
  ordersTable.addEventListener("click", handler);
  ordersTable._listener = handler;
}

async function refreshOrdersTable(app) {
    const status = document.getElementById("orderStatusFilter")?.value || "all";
    const search = document.getElementById("orderSearch")?.value || "";
    
    // Hiển thị loading trước
    const ordersPanel = app.querySelector("#orders");
    if (ordersPanel) {
        const loadingHtml = await renderOrdersTable({ status, search, loading: true });
        ordersPanel.innerHTML = loadingHtml;
    }
    
    // Sau đó fetch dữ liệu thật
    try {
        const realHtml = await renderOrdersTable({ status, search, loading: false });
        if (ordersPanel) ordersPanel.innerHTML = realHtml;
    } catch (error) {
        console.error(error);
        if (ordersPanel) ordersPanel.innerHTML = '<div class="empty-state">Lỗi tải dữ liệu</div>';
    } finally {
        attachOrdersEvents(app);
        attachFilterEvents(app);
    }
}

async function refreshMenuPanel(app) {
  const panel = app.querySelector("#menu");
  if (!panel) return;
  try {
    const menuHtml = await renderMenuManager();
    panel.innerHTML = menuHtml;
    initMenuManagerEvents(app);
  } catch (error) {
    console.error(error);
  }
}

async function refreshGalleryPanel(app) {
  const panel = app.querySelector("#gallery");
  if (!panel) return;
  try {
    const galleryHtml = await renderGalleryManager();
    panel.innerHTML = galleryHtml;
    initGalleryManagerEvents(app);
  } catch (error) {
    console.error(error);
  }
}

async function refreshSchedulePanel(app) {
  const panel = app.querySelector("#schedule");
  if (!panel) return;
  try {
    resetMealScheduleCache();
    const scheduleHtml = await renderMealSchedule();
    panel.innerHTML = scheduleHtml;
    initMealScheduleTabs(app);
  } catch (error) {
    console.error(error);
  }
}

async function refreshOverviewPanel(app) {
  const panel = app.querySelector("#overview");
  if (!panel) return;
  try {
    panel.innerHTML = await renderStats();
    initTodayDishTracker(app);
  } catch (error) {
    console.error(error);
  }
}

let realtimeUnsubscribe = null;
let menuRefreshTimer = null;
let galleryRefreshTimer = null;
let scheduleRefreshTimer = null;

function startRealtimeMenuSchedule(app) {
  if (!client || !DATABASE_ID) return;

  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }

  const menuCollections = [
    DB.COLLECTIONS.CATEGORIES,
    DB.COLLECTIONS.DISHES,
    DB.COLLECTIONS.COMBOS,
    DB.COLLECTIONS.COMBO_ITEMS,
    "orders"
  ].filter(Boolean);

  const galleryCollections = [DB.COLLECTIONS.GALLERY_MEDIA].filter(Boolean);

  const scheduleCollections = [
    DB.COLLECTIONS.WEEKLY_SCHEDULES,
    DB.COLLECTIONS.DAILY_MENU,
  ].filter(Boolean);

  const channels = [...menuCollections, ...galleryCollections, ...scheduleCollections].map(
    (collectionId) => `databases.${DATABASE_ID}.collections.${collectionId}.documents`,
  );

  if (!channels.length) return;

  realtimeUnsubscribe = client.subscribe(channels, (response) => {
    const isNewOrder = response.events.some(e => e.includes(".orders.documents.create"));
    
    if (isNewOrder) {
        refreshOrdersTable(app);
        refreshOverviewPanel(app);
    }

    const channel = response?.channels?.[0] || "";
    const isMenu = menuCollections.some((id) => channel.includes(`collections.${id}.`));
    const isGallery = galleryCollections.some((id) => channel.includes(`collections.${id}.`));
    const isSchedule = scheduleCollections.some((id) => channel.includes(`collections.${id}.`));

    if (isMenu) {
      clearTimeout(menuRefreshTimer);
      menuRefreshTimer = setTimeout(async () => {
        await refreshMenuPanel(app);
      }, 300);
    }

    if (isGallery) {
      clearTimeout(galleryRefreshTimer);
      galleryRefreshTimer = setTimeout(async () => {
        await refreshGalleryPanel(app);
      }, 300);
    }

    if (isSchedule) {
      clearTimeout(scheduleRefreshTimer);
      scheduleRefreshTimer = setTimeout(() => {
        refreshSchedulePanel(app);
        refreshOverviewPanel(app);
      }, 300);
    }
  });
}

function attachFilterEvents(app) {
  const statusFilter = app.querySelector("#orderStatusFilter");
  const searchInput = app.querySelector("#orderSearch");

  if (statusFilter) {
    statusFilter.removeEventListener("change", statusFilter._listener);
    const handler = () => refreshOrdersTable(app);
    statusFilter.addEventListener("change", handler);
    statusFilter._listener = handler;
  }

  if (searchInput) {
    searchInput.removeEventListener("input", searchInput._listener);
    const handler = debounce(() => refreshOrdersTable(app), 500);
    searchInput.addEventListener("input", handler);
    searchInput._listener = handler;
  }
}

function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export async function renderDashboard(user) {
  const app = document.getElementById("app");
  let panelsMarkup = "";
  let hasPanelError = false;

  try {
    panelsMarkup = await renderPanels();
  } catch (error) {
    hasPanelError = true;
    console.error("Không thể khởi tạo dashboard panels:", error);
    panelsMarkup = `
      <main class="tab-content">
        <section class="tab-panel active" id="overview">
          <div class="empty-state">Không thể tải dữ liệu quản trị. Vui lòng kiểm tra kết nối Appwrite rồi tải lại trang.</div>
        </section>
        <section class="tab-panel" id="orders"></section>
        <section class="tab-panel" id="stats"></section>
        <section class="tab-panel" id="menu"></section>
        <section class="tab-panel" id="gallery"></section>
        <section class="tab-panel" id="schedule"></section>
      </main>
    `;
  }

  app.innerHTML = `
    <section class="dashboard-shell">
      ${ADMIN_STYLES}
      ${renderHeader(user)}
      ${renderTabs()}
      ${panelsMarkup}
      ${renderOrderModal()}
      ${renderAddDishModal()}
    </section>
  `;

  initTabs(app);
  if (!hasPanelError) {
    initOrderDetailEvents(app);
    initMenuManagerEvents(app);
    initGalleryManagerEvents(app);
    initMealScheduleTabs(app);
    initTodayDishTracker(app);
    initRevenueStatsFeature(app);
    initNotifications(app);
    initRealtimeNotifications();
    startRealtimeMenuSchedule(app);
  }

  window.addEventListener("weekly-schedule:published", () => {
    refreshSchedulePanel(app);
    refreshOverviewPanel(app);
  });

  // System settings: stop accepting orders + kitchen overload indicator
  const acceptBtn = document.getElementById("acceptOrdersBtn");
  const applyAcceptUi = (acceptingOrders, kitchenOverloaded) => {
    if (!acceptBtn) return;
    const isPaused = acceptingOrders === false;
    acceptBtn.innerHTML = isPaused ? '<i class="fas fa-pause-circle"></i> Tạm ngừng nhận đơn' : '<i class="fas fa-check-circle"></i> Đang nhận đơn';
    
    acceptBtn.className = isPaused ? 'logout-btn status-paused' : 'logout-btn status-active';
    acceptBtn.style.background = isPaused ? "#fef2f2" : "#f0fdf4";
    acceptBtn.style.border = isPaused ? "1px solid #fee2e2" : "1px solid #dcfce7";
    acceptBtn.style.color = isPaused ? "#991b1b" : "#166534";

    acceptBtn.title = kitchenOverloaded ? "Bếp đang quá tải" : "Bật/tắt nhận đơn từ khách";
  };

  if (acceptBtn) {
    getSystemSettings().then((s) =>
      applyAcceptUi(s.acceptingOrders, s.kitchenOverloaded),
    );
    acceptBtn.addEventListener("click", async () => {
      try {
        const current = await getSystemSettings();
        const next = await setSystemSettings(
          { acceptingOrders: !current.acceptingOrders },
        );
        applyAcceptUi(next.acceptingOrders, next.kitchenOverloaded);
      } catch (err) {
        console.error(err);
        window.showToast(
          "Không thể cập nhật trạng thái nhận đơn. Hãy kiểm tra collection `system_settings` trên Appwrite.",
          "error",
        );
      }
    });
    subscribeSystemSettings((s) =>
      applyAcceptUi(s.acceptingOrders, s.kitchenOverloaded),
    );
  }

  if (!hasPanelError) {
    attachOrdersEvents(app);
    attachFilterEvents(app);
  }
}
