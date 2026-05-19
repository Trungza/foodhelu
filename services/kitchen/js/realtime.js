import { client, DATABASE_ID } from "../../shared/js/appwrite.js";
import { refreshOrders } from "./orders.js";
import { addNotification } from "./notifications.js";
import { STATUS } from "../../shared/js/utils.js";

let realtimeUnsubscribe = null;
const lastStatusByOrderId = new Map();

export function startRealtimeSubscription() {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }

  realtimeUnsubscribe = client.subscribe(
    `databases.${DATABASE_ID}.collections.orders.documents`,
    (response) => {
      const order = response.payload;

      const isUpdate = response.events.some((e) => e.includes(".update"));

      const orderId = order?.$id;
      const previousStatus = orderId ? lastStatusByOrderId.get(orderId) : undefined;
      const nextStatus = order?.status;
      if (orderId) lastStatusByOrderId.set(orderId, nextStatus);

      // Lần đầu thấy orderId này (hoặc vừa reload trang) thì chỉ cache trạng thái, không bắn "đơn mới"
      if (previousStatus === undefined) {
        refreshOrders();
        return;
      }

      // Chỉ thông báo "đơn mới từ admin" khi status CHUYỂN sang STEP_2
      if (
        isUpdate &&
        order &&
        nextStatus === STATUS.STEP_2 &&
        previousStatus !== STATUS.STEP_2
      ) {
        addNotification({
          title: "🍽️ Đơn hàng mới từ Admin",
          message: `Đơn #${order.$id.slice(-8)} - ${order.customerName || "Khách hàng"}`,
          time: new Date().toLocaleString("vi-VN"),
          orderId: order.$id,
        });
      }

      refreshOrders();
    },
  );
}

export function stopRealtimeSubscription() {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }
}

