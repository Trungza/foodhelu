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
        const headers = ["Mã đơn", "Khách hàng", "SĐT", "Thời gian", "Tổng tiền", "Thanh toán", "Trạng thái", "Hành động"];
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

        const getPaymentBadge = (method) => {
            if (method === 'qr') return '<span class="badge" style="background:#eef2ff; color:#4f46e5; border:1px solid #e0e7ff;"><i class="fas fa-university"></i> QR</span>';
            return '<span class="badge" style="background:#f8fafc; color:#64748b; border:1px solid #e2e8f0;"><i class="fas fa-money-bill-wave"></i> TM</span>';
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

        const headers = ["Mã đơn", "Khách hàng", "SĐT", "Thời gian", "Tổng tiền", "Thanh toán", "Trạng thái", "Hành động"];

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
                    ? `<span class="badge" style="background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; margin-left: 5px; font-size: 10px;" title="${escapeHtml(`Bếp báo thiếu: ${kitchenNoteValue}`)}"><i class="fas fa-exclamation-triangle"></i> BẾP BÁO THIẾU</span>`
                    : "";
                return `
                    <tr class="order-row-clickable" data-order-id="${order.$id}" style="cursor: pointer;">
                        <td>${order.$id.slice(-8)}</td>
                        <td>${escapeHtml(order.customerName)}</td>
                        <td>${escapeHtml(order.customerPhone)}</td>
                        <td>
                            <div style="font-size: 13px;">${formatDateTime(order.orderDate)}</div>
                            ${order.deliveryTime ? `<div style="font-size: 11px; color: #4f46e5; font-weight: 600;"><i class="far fa-clock"></i> Hẹn: ${formatDateTime(order.deliveryTime)}</div>` : ''}
                        </td>
                        <td>${formatCurrency(order.totalAmount)}</td>
                        <td>${getPaymentBadge(order.paymentMethod)}</td>
                        <td class="order-status-cell">${getStatusBadge(order.status)}${kitchenNoteBadge}</td>
                        <td>
                            ${canSend ? `<button class="action-btn send-kitchen" data-id="${order.$id}" title="Gửi xuống bếp" style="background:#10b981; color:white; border:none; padding:5px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-fire"></i></button>` : ''}
                            ${canCancel ? `<button class="action-btn cancel-order" data-id="${order.$id}" title="Hủy đơn" style="background:#ef4444; color:white; border:none; padding:5px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-times"></i></button>` : ''}
                            ${canPrint ? `<button class="action-btn print-order" data-id="${order.$id}" title="In đơn" style="background:#3b82f6; color:white; border:none; padding:5px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-print"></i></button>` : ''}
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
