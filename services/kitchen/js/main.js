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

// --- Page Loader Logic ---
const LOADER_START_TIME = Date.now();
function createAndInjectPageLoader() {
  if (document.getElementById('page-loader')) return;
  const loaderHtml = `
    <div id="page-loader" class="page-loader">
      <div class="loader-wrapper">
        <div class="loader-spinner"></div>
        <img src="../customer/img/logo.png" class="loader-logo" alt="Logo" onerror="this.style.display='none'">
      </div>
    </div>`;
  document.body?.insertAdjacentHTML('afterbegin', loaderHtml);
  const style = document.createElement('style');
  style.textContent = `
    .page-loader {
      position: fixed; inset: 0; background: #ffffff;
      display: flex; justify-content: center; align-items: center;
      z-index: 99999; transition: all 0.5s ease;
    }
    .page-loader.hidden { opacity: 0; visibility: hidden; transform: scale(1.1); }
    .loader-wrapper { position: relative; width: 80px; height: 80px; display: flex; justify-content: center; align-items: center; }
    .loader-logo { position: absolute; width: 40px; height: 40px; object-fit: contain; border-radius: 50%; z-index: 1; animation: logo-pulse 2s ease-in-out infinite; }
    .loader-spinner { position: absolute; width: 100%; height: 100%; border: 3px solid rgba(0, 0, 0, 0.05); border-top: 3px solid #f97316; border-radius: 50%; animation: spin-loader 1s linear infinite; }
    @keyframes spin-loader { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes logo-pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
  `;
  document.head.appendChild(style);
}

function hidePageLoader() {
  const elapsed = Date.now() - LOADER_START_TIME;
  const delay = Math.max(0, 800 - elapsed);
  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 500);
    }
  }, delay);
}

createAndInjectPageLoader();

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

 

  // Lắng nghe sự kiện đơn hàng mới thông qua Event Bus hoặc Realtime
  // Đây là logic bổ trợ để kích hoạt âm thanh khi realtime.js nhận được tín hiệu
  window.addEventListener("new-kitchen-order", () => {
    playKitchenSound();
  });

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
  try {
    renderShell(`<div class="loading-state"><i class="fas fa-spinner fa-pulse"></i><p>Đang kiểm tra đăng nhập...</p></div>`);
    injectKitchenStyles();

    const user = await getCurrentUser();
    if (!user) return redirectToGateway("Vui lòng đăng nhập.");
    if (!userHasRole(user, REQUIRED_ROLE)) return redirectToGateway("Không có quyền truy cập bếp.");

    renderDashboard(user);
  } finally {
    hidePageLoader();
  }
}

bootstrap();
