import { formatCurrency } from "../core/formatters.js";
import { fetchOrderStats } from "../data/menu-service.js";

export async function renderStats() {
    const stats = await fetchOrderStats();
    return `
        <section class="stats-grid">
            <div class="stat-card" style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="background: #eef2ff; color: #4f46e5; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    <i class="fas fa-wallet"></i>
                </div>
                <div>
                    <div class="stat-label" style="color: #64748b; font-size: 0.875rem; font-weight: 600;">Doanh thu</div>
                    <div class="stat-value" style="font-size: 1.25rem; font-weight: 700;">${formatCurrency(stats.totalRevenue)}</div>
                </div>
            </div>
            <div class="stat-card" style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="background: #f0fdf4; color: #166534; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    <i class="fas fa-box"></i>
                </div>
                <div>
                    <div class="stat-label" style="color: #64748b; font-size: 0.875rem; font-weight: 600;">Tổng đơn hàng</div>
                    <div class="stat-value" style="font-size: 1.25rem; font-weight: 700;">${stats.totalOrders}</div>
                </div>
            </div>
            <div class="stat-card" style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="background: #fffbeb; color: #92400e; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    <i class="fas fa-clock"></i>
                </div>
                <div>
                    <div class="stat-label" style="color: #64748b; font-size: 0.875rem; font-weight: 600;">Chờ xử lý</div>
                    <div class="stat-value" style="font-size: 1.25rem; font-weight: 700;">${stats.pendingOrders}</div>
                </div>
            </div>
        </section>
        <section class="today-dish-orders-panel admin-table" id="todayDishOrdersPanel">
            <div class="table-header today-dish-orders-head">
                <strong>Theo doi so luong mon hom nay</strong>
                <span id="todayDishOrdersMeta"></span>
            </div>
            <div class="today-dish-orders-list" id="todayDishOrdersList">
                <div class="empty-state">Dang tai du lieu mon hom nay...</div>
            </div>
        </section>
    `;
}
