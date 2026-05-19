import { databases, DATABASE_ID, Query } from "../../../shared/js/appwrite.js";
import { DB } from "../../../shared/js/config.js";
import { STATUS } from "../../../shared/js/utils.js";
import { formatCurrency } from "../core/formatters.js";

const COLLECTIONS = DB.COLLECTIONS;

/**
 * Calculate start and end dates for different time ranges
 */
function getDateRange(rangeType, customDate = null) {
    const today = customDate ? new Date(customDate) : new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate;

    switch (rangeType) {
        case "day": {
            startDate = new Date(today);
            endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 1);
            break;
        }
        case "week": {
            startDate = new Date(today);
            const day = startDate.getDay();
            const diff = startDate.getDate() - day;
            startDate.setDate(diff);
            
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
            break;
        }
        case "month": {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            break;
        }
        case "year": {
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear() + 1, 0, 1);
            break;
        }
        default:
            return { startDate: today, endDate: new Date(today.getTime() + 86400000) };
    }

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
    };
}

/**
 * Fetch orders for a given date range with completed status
 */
export async function fetchOrdersInRange(startDate, endDate) {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ORDERS,
            [
                Query.greaterThanEqual("$createdAt", startDate),
                Query.lessThan("$createdAt", endDate),
                Query.equal("status", STATUS.STEP_4), // Only completed orders
                Query.limit(1000),
            ]
        );
        return response.documents || [];
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}

/**
 * Calculate statistics for a date range
 */
export async function calculateStats(rangeType, customDate = null) {
    const { startDate, endDate } = getDateRange(rangeType, customDate);
    const orders = await fetchOrdersInRange(startDate, endDate);

    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const completedOrders = orders.length;
    const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    return {
        rangeType,
        startDate,
        endDate,
        totalRevenue,
        completedOrders,
        avgOrderValue,
        orders,
    };
}

/**
 * Get statistics for all time ranges
 */
export async function getAllStats(customDate = null) {
    const stats = {};
    for (const range of ["day", "week", "month", "year"]) {
        stats[range] = await calculateStats(range, customDate);
    }
    return stats;
}

/**
 * Format date for display
 */
function formatDisplayDate(dateStr, rangeType) {
    try {
        const date = new Date(dateStr);
        const options = {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        };
        
        const locale = "vi-VN";
        
        if (rangeType === "day") {
            return `Ngày ${date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}`;
        } else if (rangeType === "week") {
            const endDate = new Date(dateStr);
            endDate.setDate(endDate.getDate() + 6);
            return `${date.toLocaleDateString(locale)} - ${endDate.toLocaleDateString(locale)}`;
        } else if (rangeType === "month") {
            return `${date.toLocaleDateString(locale, { month: "long", year: "numeric" })}`;
        } else if (rangeType === "year") {
            return `Năm ${date.getFullYear()}`;
        }
        return date.toLocaleString(locale, options);
    } catch (e) {
        return dateStr;
    }
}

/**
 * Render revenue statistics HTML
 */
export async function renderRevenueStats() {
    try {
        const stats = await getAllStats();
        const dayStats = stats.day;
        const weekStats = stats.week;
        const monthStats = stats.month;
        const yearStats = stats.year;

        const statCardHtml = (label, revenue, orders, avg) => `
            <div class="stat-card">
                <div class="stat-label">${label}</div>
                <div class="stat-value">${formatCurrency(revenue)}</div>
                <div class="stat-meta">
                    <span>📦 ${orders} đơn</span>
                    <span>Avg: ${formatCurrency(avg)}</span>
                </div>
            </div>
        `;

        return `
            <div class="revenue-stats-container">
                <div class="stats-header">
                    <h2>📊 Thống kê Doanh Thu</h2>
                    <div class="stats-controls">
                        <button id="exportPdfBtn" class="btn-action" title="Xuất PDF">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button id="exportExcelBtn" class="btn-action" title="Xuất Excel">
                            <i class="fas fa-file-excel"></i> Excel
                        </button>
                        <button id="printStatsBtn" class="btn-action" title="In thống kê">
                            <i class="fas fa-print"></i> In
                        </button>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stats-row">
                        <div class="stats-col">
                            <h3><i class="fas fa-calendar-day"></i> Hôm Nay</h3>
                            ${statCardHtml("", dayStats.totalRevenue, dayStats.completedOrders, dayStats.avgOrderValue)}
                        </div>
                        <div class="stats-col">
                            <h3><i class="fas fa-calendar-week"></i> Tuần Này</h3>
                            ${statCardHtml("", weekStats.totalRevenue, weekStats.completedOrders, weekStats.avgOrderValue)}
                        </div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-col">
                            <h3><i class="fas fa-calendar"></i> Tháng Này</h3>
                            ${statCardHtml("", monthStats.totalRevenue, monthStats.completedOrders, monthStats.avgOrderValue)}
                        </div>
                        <div class="stats-col">
                            <h3><i class="fas fa-calendar-alt"></i> Năm Nay</h3>
                            ${statCardHtml("", yearStats.totalRevenue, yearStats.completedOrders, yearStats.avgOrderValue)}
                        </div>
                    </div>
                </div>

                <div class="custom-date-section">
                    <h3>📅 Thống kê Tùy Chọn</h3>
                    <div class="custom-date-controls">
                        <input type="date" id="customDateInput" class="date-input" />
                        <select id="customRangeSelect" class="range-select">
                            <option value="day">Ngày</option>
                            <option value="week">Tuần</option>
                            <option value="month">Tháng</option>
                            <option value="year">Năm</option>
                        </select>
                        <button id="applyCustomDateBtn" class="btn-apply">Xem Thống Kê</button>
                    </div>
                    <div id="customStatsResult" class="custom-stats-result" style="display: none;">
                        <div class="custom-stat-card">
                            <div class="result-label" id="resultLabel"></div>
                            <div class="result-value" id="resultRevenue"></div>
                            <div class="result-meta">
                                <span id="resultOrders"></span>
                                <span id="resultAvg"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="revenue-table-section">
                    <h3>📈 Chi Tiết Đơn Hoàn Thành (Hôm Nay)</h3>
                    <div class="table-container">
                        <table class="revenue-table">
                            <thead>
                                <tr>
                                    <th>Mã Đơn</th>
                                    <th>Khách Hàng</th>
                                    <th>Số Điện Thoại</th>
                                    <th>Thành Tiền</th>
                                    <th>Thời Gian</th>
                                </tr>
                            </thead>
                            <tbody id="revenueTableBody">
                                ${dayStats.orders.length > 0
                                    ? dayStats.orders
                                        .map((order) => {
                                            const orderIdShort = order.$id ? order.$id.slice(-8) : "";
                                            const createdDate = new Date(order.$createdAt).toLocaleString("vi-VN");
                                            return `
                                        <tr>
                                            <td>#${orderIdShort}</td>
                                            <td>${order.customerName || ""}</td>
                                            <td>${order.customerPhone || ""}</td>
                                            <td class="price-cell">${formatCurrency(order.totalAmount || 0)}</td>
                                            <td>${createdDate}</td>
                                        </tr>
                                    `;
                                        })
                                        .join("")
                                    : '<tr><td colspan="5" class="empty-cell">Không có đơn hoàn thành hôm nay</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Hidden print container -->
                <div id="printContainer" style="display: none;"></div>
            </div>
        `;
    } catch (error) {
        console.error("Error rendering revenue stats:", error);
        return `<div class="empty-state">Lỗi tải thống kê doanh thu: ${error.message}</div>`;
    }
}
