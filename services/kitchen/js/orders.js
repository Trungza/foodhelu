import { databases, DATABASE_ID, Query } from "../../shared/js/appwrite.js";
import { showToast } from "../../shared/components/toast.js";
import { showConfirmDialog } from "../../shared/components/dialog.js";
import { STATUS, getStatusText } from "../../shared/js/utils.js";
import { formatCurrency, formatDateTime, escapeHtml } from "./utils.js";
import { reportIssue } from "./reportIssue.js";

let currentTab = "all";
let ordersRefreshCallback = null;

export function setOrdersRefreshCallback(callback) {
  ordersRefreshCallback = callback;
}

export async function refreshOrders() {
  if (ordersRefreshCallback) await ordersRefreshCallback();
}

export async function renderOrders(user) {
  const allTab = document.getElementById("tab-all");
  const doingTab = document.getElementById("tab-doing");
  const contentAll = document.getElementById("kitchen-all-orders");
  const contentDoing = document.getElementById("kitchen-doing-orders");
  if (!contentAll || !contentDoing) return;

  try {
    const [processingRes, cookingRes] = await Promise.all([
      databases.listDocuments(DATABASE_ID, "orders", [
        Query.equal("status", STATUS.STEP_2),
        Query.orderAsc("orderDate"),
      ]),
      databases.listDocuments(DATABASE_ID, "orders", [
        Query.equal("status", STATUS.STEP_3),
        Query.orderAsc("orderDate"),
      ]),
    ]);

    const processingOrders = processingRes.documents;
    const cookingOrders = cookingRes.documents;
    const allOrders = [...processingOrders, ...cookingOrders];

    contentAll.innerHTML = renderOrdersList(allOrders);
    contentDoing.innerHTML = renderOrdersList(cookingOrders);

    if (currentTab === "all") {
      allTab.classList.add("active");
      doingTab.classList.remove("active");
      contentAll.style.display = "block";
      contentDoing.style.display = "none";
    } else {
      doingTab.classList.add("active");
      allTab.classList.remove("active");
      contentAll.style.display = "none";
      contentDoing.style.display = "block";
    }
  } catch (error) {
    console.error("Lỗi tải đơn hàng:", error);
    const errorHtml = `
      <div class="empty-state error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${escapeHtml(error.message)}</p>
        <button class="retry-btn" onclick="location.reload()">Thử lại</button>
      </div>`;
    contentAll.innerHTML = errorHtml;
    contentDoing.innerHTML = errorHtml;
  }
}

function renderOrdersList(orders) {
  if (!orders.length) {
    return `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có đơn hàng nào</p></div>`;
  }

  return `
    <div class="kitchen-grid">
      ${orders
        .map((order) => {
          const isCooking = order.status === STATUS.STEP_2;
          let itemsList = [];
          try {
            itemsList = JSON.parse(order.items) || [];
          } catch (e) {}

          return `
            <div class="kitchen-card" data-order-id="${order.$id}">
              <div class="kitchen-card-header">
                <div>
                  <span class="order-id">#${order.$id.slice(-8)}</span>
                  <span class="order-time"><i class="far fa-clock"></i> ${formatDateTime(order.orderDate)}</span>
                </div>
                <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
              </div>
              <div class="kitchen-card-body">
                <div class="order-items">
                  <div class="items-title">📋 Món ăn:</div>
                  <ul>
                    ${itemsList
                      .map((item) => {
                        if (item.isCombo && item.comboItems) {
                          return `
                            <li class="combo-item">
                              <strong>🍱 ${escapeHtml(item.name)} x${item.quantity}</strong>
                              <ul>
                                ${item.comboItems.map((sub) => `<li>• ${escapeHtml(sub.name)} x${sub.qtyPerCombo}</li>`).join("")}
                              </ul>
                            </li>`;
                        }
                        return `<li>🍽️ ${escapeHtml(item.name)} x${item.quantity}</li>`;
                      })
                      .join("")}
                  </ul>
                </div>
                <div class="order-total"><strong>Tổng cộng:</strong> ${formatCurrency(order.totalAmount)}</div>
                ${order.kitchenNote ? `<div class="kitchen-note"><i class="fas fa-sticky-note"></i> ${escapeHtml(order.kitchenNote)}</div>` : ""}
              </div>
              <div class="kitchen-card-footer">
                ${isCooking ? `<button class="btn-start-cooking" data-id="${order.$id}"><i class="fas fa-play"></i> Bắt đầu nấu</button>` : `<button class="btn-complete" data-id="${order.$id}"><i class="fas fa-check"></i> Hoàn thành</button>`}
                <button class="btn-report-issue" data-id="${order.$id}"><i class="fas fa-exclamation-triangle"></i> Báo thiếu món</button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

export function attachOrdersEvents() {
  const container = document.querySelector(".kitchen-orders-container");
  if (!container) return;

  container.addEventListener("click", async (e) => {
    const startBtn = e.target.closest(".btn-start-cooking");
    const completeBtn = e.target.closest(".btn-complete");
    const reportBtn = e.target.closest(".btn-report-issue");
    const orderId =
      startBtn?.dataset.id || completeBtn?.dataset.id || reportBtn?.dataset.id;
    if (!orderId) return;

    if (startBtn) {
      const ok = await showConfirmDialog({
        title: "Xác nhận bắt đầu nấu",
        message: "Bạn có chắc bắt đầu nấu đơn hàng này?",
        confirmText: "Bắt đầu",
        confirmType: "primary",
      });
      if (!ok) return;
      try {
        await databases.updateDocument(DATABASE_ID, "orders", orderId, {
          status: STATUS.STEP_3,
        });
        showToast("✅ Đã bắt đầu nấu", "success");
        await refreshOrders();
      } catch (err) {
        showToast("❌ " + err.message, "error");
      }
    } else if (completeBtn) {
      const ok = await showConfirmDialog({
        title: "Xác nhận hoàn thành",
        message: "Đơn hàng đã nấu xong?",
        confirmText: "Hoàn thành",
      });
      if (!ok) return;
      try {
        await databases.updateDocument(DATABASE_ID, "orders", orderId, {
          status: STATUS.STEP_4,
        });
        showToast("✅ Hoàn thành đơn hàng", "success");
        await refreshOrders();
      } catch (err) {
        showToast("❌ " + err.message, "error");
      }
    } else if (reportBtn) {
      try {
        await reportIssue(orderId, refreshOrders);
        await refreshOrders();
      } catch (err) {
        console.log(err.message);

        showToast("❌ " + err.message, "error");
      }
    }
  });
}

export function switchTab(tab, user) {
  currentTab = tab;
  renderOrders(user);
}
