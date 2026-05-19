import { formatCurrency } from "../core/formatters.js";
import { fetchOrderStats } from "../data/menu-service.js";

export async function renderStats() {
    const stats = await fetchOrderStats();
    return `
        <section class="stats-grid">
            <div class="stat-card">
                <div>
                    <div class="stat-value">${formatCurrency(stats.totalRevenue)}</div>
                    <div class="stat-label">Doanh thu</div>
                </div>
            </div>
            <div class="stat-card">
                <div>
                    <div class="stat-value">${stats.totalOrders}</div>
                    <div class="stat-label">Don hang</div>
                </div>
            </div>
            <div class="stat-card">
                <div>
                    <div class="stat-value">${stats.pendingOrders}</div>
                    <div class="stat-label">Cho xu ly</div>
                </div>
            </div>
            <div class="stat-card">
                <div>
                    <div class="stat-value">${stats.completedOrders}</div>
                    <div class="stat-label">Hoan thanh</div>
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
