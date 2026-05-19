import { databases, DATABASE_ID, Query } from '../../shared/js/appwrite.js';

// Ánh xạ trạng thái từ Database (Admin) sang ngôn ngữ cho Khách hàng
// index: đại diện cho vị trí trên timeline (0, 1, 2)
const STATUS_MAPPING = {
    'pending': { label: 'Chờ xử lý', class: 'status-customer-pending', step: 0 },
    'confirmed': { label: 'Bếp đang nấu', class: 'status-customer-cooking', step: 1 },
    'processing': { label: 'Bếp đang nấu', class: 'status-customer-cooking', step: 1 },
    'completed': { label: 'Đang giao hàng', class: 'status-customer-delivery', step: 2 },
    'cancelled': { label: 'Đã hủy', class: 'status-customer-cancelled', step: -1 }
};

function initOrderStatus() {
    const openBtn = document.getElementById('openTrackModal');
    const closeBtn = document.getElementById('statusClose');
    const modal = document.getElementById('statusModal');
    const trackBtn = document.getElementById('btnTrackOrder');
    const phoneInput = document.getElementById('trackPhoneInput');
    const resultContainer = document.getElementById('orderStatusResult');

    if (!openBtn || !modal) return;

    openBtn.addEventListener('click', () => {
        openBtn.classList.remove('pulse'); // Tắt hiệu ứng nhấp nháy khi khách đã click
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Đóng khi click ngoài modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    trackBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        if (!phone || phone.length < 9) {
            alert('Vui lòng nhập số điện thoại hợp lệ');
            return;
        }

        resultContainer.innerHTML = '<div class="loading-status"><i class="fas fa-spinner fa-spin"></i> Đang tìm kiếm...</div>';

        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                'orders',
                [
                    Query.equal('customerPhone', phone),
                    Query.orderDesc('orderDate'),
                    Query.limit(5)
                ]
            );

            renderResults(response.documents);
        } catch (error) {
            console.error('Lỗi tra cứu:', error);
            resultContainer.innerHTML = '<p style="color:red; text-align:center;">Có lỗi xảy ra, vui lòng thử lại sau.</p>';
        }
    });
}

function renderResults(orders) {
    const container = document.getElementById('orderStatusResult');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">Không tìm thấy đơn hàng nào với số điện thoại này.</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const statusInfo = STATUS_MAPPING[order.status] || { label: order.status, class: '' };
        const orderDate = new Date(order.orderDate).toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
        });

        // 1. Xử lý danh sách món ăn chi tiết
        let itemsListHtml = "";
        try {
            const items = JSON.parse(order.items);
            itemsListHtml = items.map(i => `
                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span>${escapeHtml(i.name)} x${i.quantity}</span>
                    <span>${Number(i.price * i.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
            `).join('');
        } catch (e) { itemsListHtml = "Không thể hiển thị chi tiết món ăn"; }

        // 2. Xử lý Timeline (Tiến trình)
        const currentStep = statusInfo.step;
        const timelineHtml = currentStep === -1 ? '' : `
            <div class="track-timeline">
                <div class="timeline-step ${currentStep >= 0 ? 'active' : ''}"><div class="step-dot"><i class="fas fa-receipt"></i></div><div class="step-label">Đã nhận</div></div>
                <div class="timeline-step ${currentStep >= 1 ? 'active' : ''}"><div class="step-dot"><i class="fas fa-utensils"></i></div><div class="step-label">Đang nấu</div></div>
                <div class="timeline-step ${currentStep >= 2 ? 'active' : ''}"><div class="step-dot"><i class="fas fa-truck"></i></div><div class="step-label">Đang giao</div></div>
            </div>
        `;

        // 3. Xử lý nhãn thời gian hẹn (nếu có)
        const scheduledLabel = order.deliveryTime ? `<div style="color: #0369a1; font-weight: 500;"><i class="far fa-clock"></i> Hẹn giao: ${new Date(order.deliveryTime).toLocaleString('vi-VN')}</div>` : '';

        return `
            <div class="track-item">
                <div class="track-item-header">
                    <span class="track-id">#${order.$id.slice(-6).toUpperCase()}</span>
                    <span class="track-status-badge ${statusInfo.class}">${statusInfo.label}</span>
                </div>

                <div class="track-customer-detail">
                    <div>Khách hàng: <strong>${escapeHtml(order.customerName)}</strong></div>
                    <div><i class="fas fa-map-marker-alt"></i> ${escapeHtml(order.customerAddress)}</div>
                    <div><i class="far fa-calendar-alt"></i> Đặt lúc: ${orderDate}</div>
                    ${scheduledLabel}
                </div>

                ${timelineHtml}

                <div class="track-items-summary">
                    <div style="font-weight:600; margin-bottom:5px; border-bottom:1px solid #f1f5f9;">Chi tiết món:</div>
                    ${itemsListHtml}
                </div>

                <div class="track-info">
                    <div style="text-align:right; font-size:16px;">Tổng tiền: <strong style="color:var(--primary-color)">${Number(order.totalAmount).toLocaleString('vi-VN')}đ</strong></div>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Khởi chạy
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrderStatus);
} else {
    initOrderStatus();
}