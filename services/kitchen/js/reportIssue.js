// services/kitchen/reportIssue.js
import { databases, DATABASE_ID, ID } from "../../shared/js/appwrite.js";
import { showConfirmDialog } from "../../shared/components/dialog.js";
import { showToast } from "../../shared/components/toast.js";
import { showInputDialog } from "./input-dialog.js";
import { DB } from "../../shared/js/config.js";

console.log("[kitchen] reportIssue.js loaded (no updatedAt)");

export async function reportIssue(orderId, refreshCallback) {
  const issue = await showInputDialog({
    title: "⚠️ Báo cáo thiếu món",
    message: "Vui lòng nhập lý do (ví dụ: hết gà rán, thiếu rau...):",
    placeholder: "Nhập lý do thiếu món...",
    confirmText: "Gửi báo cáo",
    cancelText: "Hủy",
  });

  if (!issue) return false;

  const trimmedIssue = issue.trim();
  if (!trimmedIssue) return false;

  const confirmed = await showConfirmDialog({
    title: "Xác nhận gửi báo cáo",
    message: `Bạn có chắc muốn gửi báo cáo: "${trimmedIssue}" cho quản lý?`,
    confirmText: "Gửi",
    cancelText: "Hủy",
  });
  if (!confirmed) return false;

  try {
    const ordersCollection = DB.COLLECTIONS.ORDERS || "orders";

    const order = await databases.getDocument(
      DATABASE_ID,
      ordersCollection,
      orderId,
    );

    await databases.updateDocument(DATABASE_ID, ordersCollection, orderId, {
      kitchenNote: trimmedIssue,
    });

    // Verify write to DB (tránh trường hợp UI báo ok nhưng DB không lưu)
    const updatedOrder = await databases.getDocument(
      DATABASE_ID,
      ordersCollection,
      orderId,
    );
    const savedNote = String(updatedOrder?.kitchenNote || "").trim();
    if (savedNote !== trimmedIssue) {
      throw new Error(
        "Không lưu được kitchenNote lên DB (kiểm tra schema/permissions collection orders).",
      );
    }

    // NOTE: Không tạo document ở collection `notifications` vì môi trường hiện tại
    // không có collection này (404). Admin sẽ nhận thông báo qua realtime update
    // của `orders.kitchenNote`.
    showToast("📢 Đã gửi báo cáo", "success");
    if (refreshCallback) await refreshCallback();
    return true;
  } catch (err) {
    console.error(err);
    showToast("❌ Lỗi: " + (err?.message || err), "error");
    throw err;
  }
}
