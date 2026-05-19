export function formatCurrency(amount) {
    return amount.toLocaleString("vi-VN") + "đ";
}

export function getOrderStatusBadge(status) {
    const map = {
        pending_admin: `<span class="badge pending">Chờ xử lý</span>`,
        sent_to_kitchen: `<span class="badge confirmed">Đã gửi bếp</span>`,
        hold: `<span class="badge warning">Tạm treo</span>`,
        done: `<span class="badge completed">Hoàn thành</span>`
    };

    return map[status] || status;
}

export function getMealStatusBadge(status) {
    return status === "available"
        ? `<span class="badge completed">Có sẵn</span>`
        : `<span class="badge pending">Hết món</span>`;
}
