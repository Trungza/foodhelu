import { formatCurrency } from "../core/formatters.js";
import { databases, DATABASE_ID, ID } from "../../../shared/js/appwrite.js";
import { escapeHtml, getStatusText, STATUS } from "../../../shared/js/utils.js";
import { DB } from "../../../shared/js/config.js";

function getImageUrl(imageId) {
  if (!imageId) return null;
  const projectId = "69eb91050034ff637921";
  const bucketId = "dish_images";
  return `https://fra.cloud.appwrite.io/v1/storage/buckets/${bucketId}/files/${imageId}/view?project=${projectId}`;
}

export function initOrderDetailEvents(root) {
  window.openOrderDetail = async function (orderId) {
    try {
      const order = await databases.getDocument(DATABASE_ID, "orders", orderId);
      if (!order) {
        window.showToast("Không tìm thấy đơn hàng", "error");
        return;
      }

      let items = [];
      try {
        const parsed = JSON.parse(order.items);
        items = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        items = [];
      }

      const renderItem = (item) => {
        if (item.isCombo && item.comboItems && item.comboItems.length) {
          const comboItemsHtml = item.comboItems
            .map((sub) => {
              const imageUrl = sub.imageId ? getImageUrl(sub.imageId) : null;
              return `
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                ${imageUrl ? `<img src="${imageUrl}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 6px;" />` : ""}
                                <span>${escapeHtml(sub.name)} x ${sub.qtyPerCombo}</span>
                            </div>
                        `;
            })
            .join("");
          return `
                        <div style="margin-bottom: 16px; border-left: 3px solid #2563eb; padding-left: 12px;">
                            <strong>🍱 ${escapeHtml(item.name)}</strong> x ${item.quantity}
                            <div style="margin-top: 8px; margin-left: 12px;">${comboItemsHtml}</div>
                        </div>
                    `;
        } else {
          const imageUrl =
            item.image || (item.dishId ? getImageUrl(item.dishId) : null);
          return `
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                            ${imageUrl ? `<img src="${imageUrl}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 8px;" />` : '<div style="width: 36px;"></div>'}
                            <span>${escapeHtml(item.name)} x ${item.quantity} – ${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `;
        }
      };

      const itemsHtml = items.map(renderItem).join("");
      const formatDate = (dateStr) =>
        dateStr ? new Date(dateStr).toLocaleString("vi-VN") : "Không có";

      const canSend = order.status === STATUS.STEP_1;
      const canCancel =
        order.status === STATUS.STEP_1 || order.status === STATUS.STEP_2;

      const actionButtons = `
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;">
                    ${canSend ? `<button id="sendToKitchenBtn" class="btn-primary" style="background: #10b981;">🍳 Gửi xuống bếp</button>` : ""}
                    ${canCancel ? `<button id="cancelOrderBtn" class="btn-secondary" style="background: #ef4444; color: #ffffff;">🗑️ Hủy đơn</button>` : ""}
                </div>
            `;

      const detailHtml = `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <p><strong>Mã đơn:</strong> ${order.$id}</p>
                        <p><strong>Khách hàng:</strong> ${escapeHtml(order.customerName)}</p>
                        <p><strong>SĐT:</strong> ${escapeHtml(order.customerPhone)}</p>
                        <p><strong>Địa chỉ:</strong> ${escapeHtml(order.customerAddress)}</p>
                        <p><strong>Ngày đặt:</strong> ${formatDate(order.orderDate)}</p>
                        <p><strong>Hẹn giờ giao:</strong> ${order.deliveryTime ? formatDate(order.deliveryTime) : "Giao ngay"}</p>
                        <p><strong>Tổng tiền:</strong> ${formatCurrency(order.totalAmount)}</p>
                        <p><strong>Trạng thái:</strong> ${getStatusText(order.status)}</p>
                    </div>
                    <hr />
                    <div>
                        <strong>Chi tiết món ăn:</strong>
                        <div style="margin-top: 8px;">${itemsHtml}</div>
                    </div>
                    ${actionButtons}
                </div>
            `;

      const modal = root.querySelector("#orderModal");
      const modalBody = root.querySelector("#orderDetailContent");
      if (!modal || !modalBody) return;

      modalBody.innerHTML = detailHtml;

      

      const sendBtn = modalBody.querySelector("#sendToKitchenBtn");
      if (sendBtn) {
        sendBtn.addEventListener("click", async () => {
          try {
           
            await databases.updateDocument(DATABASE_ID, "orders", order.$id, {
              status: STATUS.STEP_2, // STATUS.STEP_2 là "processing" hoặc tùy bạn
            });

           
            try {
              const nowIso = new Date().toISOString();
              await databases.createDocument(
                DATABASE_ID,
                DB.COLLECTIONS.NOTIFICATIONS || "notifications",
                ID.unique(),
                {
                role: "kitchen",
                title: "🛎️ Đơn hàng mới",
                message: `Đơn #${order.$id.slice(-8)} - ${order.customerName} vừa được gửi xuống bếp.`,
                orderId: order.$id,
                createdAt: nowIso,
                updatedAt: nowIso,
                isUnread: true,
                },
              );
            } catch (notifError) {
              console.warn("Khong tao duoc thong bao cho bep:", notifError);
            }

            window.showToast("Đã gửi đơn xuống bếp!", "success");
            window.closeOrderDetail();
            if (typeof window.refreshOrdersTable === "function")
              await window.refreshOrdersTable();
            else location.reload();
          } catch (error) {
            window.showToast("Lỗi: " + error.message, "error");
          }
        });
      }

      const cancelBtn = modalBody.querySelector("#cancelOrderBtn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", async () => {
          try {
            await databases.updateDocument(DATABASE_ID, "orders", order.$id, {
              status: "cancelled",
            });
            window.showToast("Đã hủy đơn hàng!", "success");
            window.closeOrderDetail();
            if (typeof window.refreshOrdersTable === "function")
              await window.refreshOrdersTable();
            else location.reload();
          } catch (error) {
            window.showToast("Lỗi: " + error.message, "error");
          }
        });
      }

      modal.classList.add("active");
    } catch (error) {
      console.error("Lỗi tải chi tiết đơn hàng:", error);
      window.showToast("Không thể tải thông tin đơn hàng", "error");
    }
  };

  window.closeOrderDetail = function () {
    const modal = root.querySelector("#orderModal");
    if (modal) modal.classList.remove("active");
  };

  const closeBtn = root.querySelector("#closeOrderModal");
  if (closeBtn)
    closeBtn.addEventListener("click", () => window.closeOrderDetail());

  const modal = root.querySelector("#orderModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) window.closeOrderDetail();
    });
  }
}
