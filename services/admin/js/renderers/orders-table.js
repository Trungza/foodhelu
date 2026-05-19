// services/admin/renderers/orders-table.js
import { formatCurrency } from "../core/formatters.js";
import { databases, DATABASE_ID, Query } from "../../../shared/js/appwrite.js";
import { renderDataTable } from "./table.js";
import { escapeHtml, STATUS } from "../../../shared/js/utils.js";
import { renderSelect } from "../../../shared/components/select-component.js";

export async function renderOrdersTable({ status = 'all', search = '', loading = false } = {}) {
    // Định nghĩa các option cho select status
    const statusOptions = [
        { value: "all", label: "Tất cả trạng thái" },
        { value: STATUS.STEP_1, label: "Chờ xử lý" },
        { value: STATUS.STEP_2, label: "Đã xác nhận" },
        { value: STATUS.STEP_3, label: "Đang nấu" },
        { value: STATUS.STEP_4, label: "Hoàn thành" },
        { value: STATUS.CENCELLED, label: "Đã hủy" }
    ];

    const statusSelectHtml = renderSelect({
        id: "orderStatusFilter",
        className: "order-status-filter",
        options: statusOptions,
        selectedValue: status,
        includeEmptyOption: false
    });

    // Nếu chỉ yêu cầu loading, trả về bảng với spinner (không fetch dữ liệu)
    if (loading) {
        const headers = ["Mã đơn", "Khách hàng", "Số điện thoại", "Ngày đặt", "Hẹn giờ giao", "Tổng tiền", "Trạng thái", "Hành động"];
        return `
            <div class="admin-table">
                <div class="table-header">
                    <h3>📦 Đơn hàng</h3>
                    <div class="filters">
                        ${statusSelectHtml}
                        <input type="text" id="orderSearch" class="search-input" placeholder="Tìm theo tên hoặc SĐT" value="${escapeHtml(search)}" />
                    </div>
                </div>
                ${renderDataTable({
                    tableClass: "data-table",
                    headers: headers,
                    loading: true,
                    loadingMessage: "Đang tải đơn hàng...",
                })}
            </div>
        `;
    }

    // Bình thường, fetch dữ liệu và render
    try {
        let queries = [Query.orderDesc("orderDate")];
        if (status !== 'all') queries.push(Query.equal("status", status));

        const response = await databases.listDocuments(DATABASE_ID, "orders", queries);
        let orders = response.documents;

        if (search.trim()) {
            const term = search.trim().toLowerCase();
            orders = orders.filter(order =>
                (order.customerName?.toLowerCase().includes(term)) ||
                (order.customerPhone?.toLowerCase().includes(term))
            );
        }

        const formatDateTime = (value) => {
            if (!value) return "Giao ngay";
            try { return new Date(value).toLocaleString("vi-VN"); }
            catch { return "Không xác định"; }
        };

        const getStatusBadge = (status) => {
            const map = {
                pending: '<span class="badge pending">Chờ xử lý</span>',
                confirmed: '<span class="badge confirmed">Đã xác nhận</span>',
                processing: '<span class="badge processing">Đang nấu</span>',
                completed: '<span class="badge completed">Hoàn thành</span>',
                cancelled: '<span class="badge warning">Đã hủy</span>'
            };
            return map[status] || status;
        };

        const headers = ["Mã đơn", "Khách hàng", "Số điện thoại", "Ngày đặt", "Hẹn giờ giao", "Tổng tiền", "Trạng thái", "Hành động"];

        let rowsHtml = '';
        if (orders.length === 0) {
            rowsHtml = '';
        } else {
            rowsHtml = orders.map(order => {
                const canSend = order.status === STATUS.STEP_1;
                const canCancel = order.status === STATUS.STEP_1 || order.status === STATUS.STEP_2;
                const canPrint = order.status === STATUS.STEP_4;
                const kitchenNoteValue = String(order?.kitchenNote || "").trim();
                const kitchenNoteBadge = kitchenNoteValue
                    ? `<span class="badge kitchen-note" title="${escapeHtml(`Bếp báo thiếu món: ${kitchenNoteValue}`)}">⚠️ kitchenNote</span>`
                    : "";
                return `
                    <tr class="order-row-clickable" data-order-id="${order.$id}" style="cursor: pointer;">
                        <td>${order.$id.slice(-8)}</td>
                        <td>${escapeHtml(order.customerName)}</td>
                        <td>${escapeHtml(order.customerPhone)}</td>
                        <td>${formatDateTime(order.orderDate)}</td>
                        <td>${formatDateTime(order.deliveryTime)}</td>
                        <td>${formatCurrency(order.totalAmount)}</td>
                        <td class="order-status-cell">${getStatusBadge(order.status)}${kitchenNoteBadge}</td>
                        <td>
                            ${canSend ? `<button class="action-btn send-kitchen" data-id="${order.$id}" title="Gửi xuống bếp">🍳</button>` : ''}
                            ${canCancel ? `<button class="action-btn cancel-order" data-id="${order.$id}" title="Hủy đơn">🗑️</button>` : ''}
                            ${canPrint ? `<button class="action-btn print-order" data-id="${order.$id}" title="In đơn">🖨️</button>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const tableHtml = renderDataTable({
            tableClass: "data-table",
            headers: headers,
            rows: rowsHtml,
            emptyMessage: "Không có đơn hàng nào phù hợp"
        });

        return `
            <div class="admin-table">
                <div class="table-header">
                    <h3>📦 Đơn hàng</h3>
                    <div class="filters">
                        ${statusSelectHtml}
                        <input type="text" id="orderSearch" class="search-input" placeholder="Tìm theo tên hoặc SĐT" value="${escapeHtml(search)}" />
                    </div>
                </div>
                ${tableHtml}
            </div>
        `;
    } catch (error) {
        console.error("Lỗi tải đơn hàng:", error);
        return `<div class="empty-state">Lỗi tải đơn hàng</div>`;
    }
}
