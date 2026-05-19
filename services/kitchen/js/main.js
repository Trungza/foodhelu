// main.js - entry point kitchen
import {
  getCurrentUser,
  logoutCurrentSession,
  userHasRole,
} from "../../shared/js/auth-service.js";
import { showConfirmDialog } from "../../shared/components/dialog.js";
import { escapeHtml } from "../../shared/js/utils.js";
import { kitchenStyles } from "../styles/kitchen-styles.js";
import {
  renderOrders,
  attachOrdersEvents,
  switchTab,
  setOrdersRefreshCallback,
} from "./orders.js";
import { initNotifications, showNotificationsModal, initRealtimeNotifications } from "./notifications.js";
import {
  startRealtimeSubscription,
  stopRealtimeSubscription,
} from "./realtime.js";
import {
  getSystemSettings,
  setSystemSettings,
  subscribeSystemSettings,
} from "../../shared/js/system-settings.js";

const REQUIRED_ROLE = "kitchen";

// ========== Các hàm tiện ích ==========
let stylesInjected = false;
function injectKitchenStyles() {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.textContent = kitchenStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

function renderShell(content) {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="service-shell kitchen-shell">${content}</div>`;
}

function redirectToGateway(message = "") {
  const target = "../../index.html" + (message ? `?error=${encodeURIComponent(message)}` : "");
  window.location.replace(target);
}

// ========== Render Dashboard ==========
function renderDashboard(user) {
  renderShell(`
    <section class="dashboard-shell">
      <header class="dashboard-topbar">
        <div class="dashboard-brand">
          <h1>🍳 Khu vực bếp</h1>
          <p>Quản lý đơn hàng cần chế biến</p>
        </div>
        <div class="dashboard-actions">
          <button class="ghost-button" id="kitchenOverloadBtn" title="Bật/tắt trạng thái quá tải">
            <i class="fas fa-exclamation-circle"></i> Quá tải
          </button>
          <div class="notification-bell" id="notificationBell">
            <i class="fas fa-concierge-bell"></i>
            <span id="notification-badge" class="badge">0</span>
          </div>
          <div class="user-chip"><i class="fas fa-user-circle"></i> ${escapeHtml(user.name || user.email)}</div>
          <button class="ghost-button" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>
        </div>
      </header>
      <main class="dashboard-main">
        <div class="kitchen-tabs">
          <button id="tab-all" class="kitchen-tab active"><i class="fas fa-list"></i> Tất cả đơn hàng</button>
          <button id="tab-doing" class="kitchen-tab"><i class="fas fa-fire"></i> Đơn đang làm</button>
        </div>
        <div class="kitchen-orders-container">
          <div id="kitchen-all-orders" class="kitchen-tab-content"></div>
          <div id="kitchen-doing-orders" class="kitchen-tab-content" style="display: none;"></div>
        </div>
      </main>
    </section>
  `);

  // Sự kiện đăng xuất
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    const ok = await showConfirmDialog({
      title: "Đăng xuất",
      message: "Bạn chắc chắn muốn đăng xuất?",
    });
    if (ok) {
      await logoutCurrentSession();
      stopRealtimeSubscription();
      redirectToGateway();
    }
  });

  // Chuyển tab
  const allTab = document.getElementById("tab-all");
  const doingTab = document.getElementById("tab-doing");
  allTab?.addEventListener("click", () => switchTab("all", user));
  doingTab?.addEventListener("click", () => switchTab("doing", user));

  // Chuông thông báo
  const bell = document.getElementById("notificationBell");
  if (bell) bell.addEventListener("click", () => showNotificationsModal());

  // Quá tải bếp
  const overloadBtn = document.getElementById("kitchenOverloadBtn");
  const applyOverloadUi = (isOverloaded) => {
    if (!overloadBtn) return;
    overloadBtn.classList.toggle("is-overloaded", !!isOverloaded);
    overloadBtn.innerHTML = isOverloaded
      ? `<i class="fas fa-exclamation-circle"></i> Quá tải: BẬT`
      : `<i class="fas fa-exclamation-circle"></i> Quá tải`;
  };
  if (overloadBtn) {
    getSystemSettings().then((s) => applyOverloadUi(s.kitchenOverloaded));
    overloadBtn.addEventListener("click", async () => {
      try {
        const current = await getSystemSettings();
        const next = await setSystemSettings(
          { kitchenOverloaded: !current.kitchenOverloaded },
        );
        applyOverloadUi(next.kitchenOverloaded);
      } catch (err) {
        console.error(err);
        alert(
          "Không thể cập nhật trạng thái quá tải. Hãy kiểm tra collection `system_settings` trên Appwrite.",
        );
      }
    });
    subscribeSystemSettings((s) => applyOverloadUi(s.kitchenOverloaded));
  }

  attachOrdersEvents();
  setOrdersRefreshCallback(() => renderOrders(user));
  renderOrders(user);

  // Realtime
  startRealtimeSubscription();
  initNotifications();
  initRealtimeNotifications();
}

// ========== Bootstrap ==========
async function bootstrap() {
  renderShell(`<div class="loading-state"><i class="fas fa-spinner fa-pulse"></i><p>Đang kiểm tra đăng nhập...</p></div>`);
  injectKitchenStyles();

  const user = await getCurrentUser();
  if (!user) return redirectToGateway("Vui lòng đăng nhập.");
  if (!userHasRole(user, REQUIRED_ROLE)) return redirectToGateway("Không có quyền truy cập bếp.");

  renderDashboard(user);
}

bootstrap();
