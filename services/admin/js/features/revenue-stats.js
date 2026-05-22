import { calculateStats, getAllStats, fetchOrdersInRange } from "../renderers/revenue-stats.js";
import { formatCurrency } from "../core/formatters.js";
import { showToast } from "../../../shared/components/toast.js";
import { escapeHtml } from "../../../shared/js/utils.js"; // Import escapeHtml

/**
 * Calculate date range for custom stats
 */
function getDateRange(rangeType, customDate) {
    const date = new Date(customDate);
    date.setHours(0, 0, 0, 0);
    
    let startDate, endDate;

    switch (rangeType) {
        case "day": {
            startDate = new Date(date);
            endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            break;
        }
        case "week": {
            startDate = new Date(date);
            const day = startDate.getDay();
            const diff = startDate.getDate() - day;
            startDate.setDate(diff);
            
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
            break;
        }
        case "month": {
            startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            break;
        }
        case "year": {
            startDate = new Date(date.getFullYear(), 0, 1);
            endDate = new Date(date.getFullYear() + 1, 0, 1);
            break;
        }
        default:
            return { startDate: date, endDate: new Date(date.getTime() + 86400000) };
    }

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startDateObj: startDate,
        endDateObj: endDate,
    };
}

/**
 * Format label for date range display
 */
function formatRangeLabel(rangeType, dateObj) {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    const locale = "vi-VN";
    
    if (rangeType === "day") {
        return `Ngày ${dateObj.toLocaleDateString(locale, options)}`;
    } else if (rangeType === "week") {
        const endDate = new Date(dateObj);
        endDate.setDate(endDate.getDate() + 6);
        return `Tuần ${dateObj.toLocaleDateString(locale, options)} - ${endDate.toLocaleDateString(locale, options)}`;
    } else if (rangeType === "month") {
        return `Tháng ${dateObj.toLocaleDateString(locale, { month: "long", year: "numeric" })}`;
    } else if (rangeType === "year") {
        return `Năm ${dateObj.getFullYear()}`;
    }
    return dateObj.toLocaleDateString(locale, options);
}

/**
 * Generate CSV content
 */
function generateCsvContent(stats, rangeType) {
    const headers = ["Mã Đơn", "Khách Hàng", "Số Điện Thoại", "Địa Chỉ", "Thành Tiền", "Thời Gian"];
    const rows = stats.orders.map((order) => {
        const orderIdShort = order.$id ? order.$id.slice(-8) : "";
        const createdDate = new Date(order.$createdAt).toLocaleString("vi-VN");
        return [
            `#${orderIdShort}`,
            order.customerName || "",
            order.customerPhone || "",
            order.customerAddress || "",
            order.totalAmount || 0,
            createdDate,
        ];
    });

    const csvContent = [
        ["THỐNG KÊ DOANH THU - " + formatRangeLabel(rangeType, new Date(stats.startDate))],
        [
            `Tổng Doanh Thu: ${formatCurrency(stats.totalRevenue)}`,
            `Số Đơn: ${stats.completedOrders}`,
            `Giá Trị Trung Bình: ${formatCurrency(stats.avgOrderValue)}`,
        ],
        [],
        headers,
        ...rows,
        [],
        [`Tổng Cộng`, "", "", "", stats.totalRevenue, ""],
    ];

    return csvContent.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Export to CSV/Excel
 */
export async function exportToExcel(stats, rangeType) {
    const csv = generateCsvContent(stats, rangeType);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const filename = `doanh-thu-${rangeType}-${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Đã xuất file Excel: ${filename}`, "success");
}

/**
 * Generate PDF HTML
 */
function generatePdfHtml(stats, rangeType) {
    const locale = "vi-VN";
    const dateObj = new Date(stats.startDate);
    const rangeLabel = formatRangeLabel(rangeType, dateObj);

    const ordersHtml = stats.orders
        .map((order) => {
            const orderIdShort = order.$id ? order.$id.slice(-8) : "";
            const createdDate = new Date(order.$createdAt).toLocaleString(locale);
            return `
                <tr>
                    <td>#${orderIdShort}</td>
                    <td>${escapeHtml(order.customerName || "")}</td>
                    <td>${escapeHtml(order.customerPhone || "")}</td>
                    <td style="text-align: right;">${formatCurrency(order.totalAmount || 0)}</td>
                    <td>${createdDate}</td>
                </tr>
            `;
        })
        .join("");

    return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="utf-8" />
            <title>Thống kê doanh thu - ${rangeLabel}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Arial', sans-serif; 
                    color: #1a1a1a;
                    padding: 20px;
                    line-height: 1.5;
                }
                .container {
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                }
                .header h1 {
                    font-size: 28px;
                    color: #2563eb;
                    margin-bottom: 10px;
                }
                .header p {
                    font-size: 14px;
                    color: #666;
                }
                .summary {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .summary-card {
                    background: #f0f9ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                }
                .summary-card .label {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 10px;
                }
                .summary-card .value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2563eb;
                }
                .summary-card .unit {
                    font-size: 12px;
                    color: #999;
                    margin-top: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th {
                    background: #2563eb;
                    color: white;
                    padding: 12px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 14px;
                }
                td {
                    border-bottom: 1px solid #ddd;
                    padding: 12px;
                    font-size: 13px;
                }
                tr:nth-child(even) {
                    background: #f9fafb;
                }
                tr:hover {
                    background: #f0f9ff;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #999;
                }
                .print-date {
                    margin-top: 10px;
                    font-size: 11px;
                    color: #ccc;
                }
                @media print {
                    body { padding: 0; }
                    .container { max-width: 100%; }
                    page-break-inside: avoid;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 THỐNG KÊ DOANH THU</h1>
                    <p>${rangeLabel}</p>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <div class="label">Tổng Doanh Thu</div>
                        <div class="value">${formatCurrency(stats.totalRevenue)}</div>
                        <div class="unit">VND</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Số Đơn Hoàn Thành</div>
                        <div class="value">${stats.completedOrders}</div>
                        <div class="unit">đơn</div>
                    </div>
                    <div class="summary-card">
                        <div class="label">Giá Trị Trung Bình</div>
                        <div class="value">${formatCurrency(stats.avgOrderValue)}</div>
                        <div class="unit">VND/đơn</div>
                    </div>
                </div>

                <h3 style="margin-bottom: 15px; color: #2563eb;">Danh Sách Đơn Hàng</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%;">Mã Đơn</th>
                            <th style="width: 20%;">Khách Hàng</th>
                            <th style="width: 15%;">Số Điện Thoại</th>
                            <th style="width: 30%; text-align: right;">Thành Tiền</th>
                            <th style="width: 25%;">Thời Gian</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordersHtml || '<tr><td colspan="5">Không có dữ liệu</td></tr>'}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Báo cáo được tạo vào: ${new Date().toLocaleString("vi-VN")}</p>
                    <div class="print-date">© 2026node_modules/
                    .env
                    .DS_Store
                     BANCOM - Hệ thống quản lý nhà hàng</div>
                </div>
            </div>
        </body>
        </html>
    `;
}

/**
 * Export to PDF
 */
export async function exportToPdf(stats, rangeType) {
    const htmlContent = generatePdfHtml(stats, rangeType);
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    
    if (!printWindow) {
        showToast("Không thể mở cửa sổ PDF. Hãy kiểm tra chặn pop-up.", "error");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Use setTimeout to ensure document is fully loaded before printing
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

/**
 * Chart instances for cleanup
 */
let revenueChartInstance = null;
let topDishesChartInstance = null;

// Theo dõi thống kê hiện tại đang được xem (để dùng cho các nút ở Header)
let currentViewStats = null;
let currentViewRange = "day";

/**
 * Process data for Revenue line chart
 */
function processTimeData(orders, rangeType, startDate) {
    const labels = [];
    const values = [];
    const dataMap = new Map();

    if (rangeType === "day") {
        for (let i = 0; i < 24; i++) {
            labels.push(`${i}h`);
            dataMap.set(i, 0);
        }
        orders.forEach(o => {
            const hour = new Date(o.$createdAt).getHours();
            const amount = o.categoryRevenue !== undefined ? o.categoryRevenue : (o.totalAmount || 0);
            dataMap.set(hour, (dataMap.get(hour) || 0) + amount);
        });
        labels.forEach((_, i) => values.push(dataMap.get(i)));
    } else if (rangeType === "week") {
        const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
        days.forEach((d, i) => {
            labels.push(d);
            dataMap.set(i, 0);
        });
        orders.forEach(o => {
            const jsDay = new Date(o.$createdAt).getDay(); // 0 is Sunday
            const index = jsDay === 0 ? 6 : jsDay - 1;
            const amount = o.categoryRevenue !== undefined ? o.categoryRevenue : (o.totalAmount || 0);
            dataMap.set(index, (dataMap.get(index) || 0) + amount);
        });
        labels.forEach((_, i) => values.push(dataMap.get(i)));
    } else if (rangeType === "month") {
        const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            labels.push(i.toString());
            dataMap.set(i, 0);
        }
        orders.forEach(o => {
            const day = new Date(o.$createdAt).getDate();
            const amount = o.categoryRevenue !== undefined ? o.categoryRevenue : (o.totalAmount || 0);
            dataMap.set(day, (dataMap.get(day) || 0) + amount);
        });
        labels.forEach(l => values.push(dataMap.get(parseInt(l))));
    } else if (rangeType === "year") {
        const months = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
        months.forEach((m, i) => {
            labels.push(m);
            dataMap.set(i, 0);
        });
        orders.forEach(o => {
            const month = new Date(o.$createdAt).getMonth();
            const amount = o.categoryRevenue !== undefined ? o.categoryRevenue : (o.totalAmount || 0);
            dataMap.set(month, (dataMap.get(month) || 0) + amount);
        });
        labels.forEach((_, i) => values.push(dataMap.get(i)));
    }

    return { labels, values };
}

/**
 * Calculate top selling dishes from order items
 */
function calculateTopDishes(orders) {
    const dishMap = new Map();
    orders.forEach(order => {
        let items = [];
        try {
            items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        } catch (e) { items = []; }
        
        items.forEach(item => {
            const name = item.name || item.dishName;
            const qty = Number(item.quantity || 0);
            if (name) {
                dishMap.set(name, (dishMap.get(name) || 0) + qty);
            }
        });
    });
    return Array.from(dishMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
}

/**
 * Render charts using Chart.js
 */
async function updateCharts(container, stats, rangeType) {
    if (!window.Chart) {
        await new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    const ctxRevenue = container.querySelector("#revenueChart")?.getContext("2d");
    const ctxDishes = container.querySelector("#topDishesChart")?.getContext("2d");

    if (!ctxRevenue || !ctxDishes) return;

    // 1. Line Chart cho Doanh thu
    const timeData = processTimeData(stats.orders, rangeType, new Date(stats.startDate));
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: timeData.labels,
            datasets: [{
                label: 'Doanh thu (VND)',
                data: timeData.values,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 2. Doughnut Chart cho Món bán chạy
    const topDishes = calculateTopDishes(stats.orders);
    if (topDishesChartInstance) topDishesChartInstance.destroy();
    topDishesChartInstance = new Chart(ctxDishes, {
        type: 'doughnut',
        data: {
            labels: topDishes.map(d => d[0]),
            datasets: [{
                data: topDishes.map(d => d[1]),
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

/**
 * Hàm hỗ trợ in báo cáo
 */
function printReport(stats, rangeType) {
    const htmlContent = generatePdfHtml(stats, rangeType);
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    
    if (!printWindow) {
        showToast("Không thể mở cửa sổ in. Hãy kiểm tra chặn pop-up.", "error");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
}

/**
 * Initialize revenue stats feature
 */
export async function initRevenueStatsFeature(app) {
    const container = app.querySelector(".revenue-stats-container");
    if (!container) return;

    // Handle export to PDF
    const exportPdfBtn = container.querySelector("#exportPdfBtn");
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", async () => {
            try {
                const allStats = await getAllStats();
                const stats = currentViewStats || allStats.day;
                const range = currentViewStats ? currentViewRange : "day";
                await exportToPdf(stats, range);
                showToast("Đang xuất PDF...", "success");
            } catch (error) {
                console.error("Error exporting PDF:", error);
                showToast("Lỗi xuất PDF: " + error.message, "error");
            }
        });
    }

    // Handle export to Excel
    const exportExcelBtn = container.querySelector("#exportExcelBtn");
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener("click", async () => {
            try {
                const allStats = await getAllStats();
                const stats = currentViewStats || allStats.day;
                const range = currentViewStats ? currentViewRange : "day";
                await exportToExcel(stats, range);
            } catch (error) {
                console.error("Error exporting Excel:", error);
                showToast("Lỗi xuất Excel: " + error.message, "error");
            }
        });
    }

    // Handle print
    const printStatsBtn = container.querySelector("#printStatsBtn");
    if (printStatsBtn) {
        printStatsBtn.addEventListener("click", async () => {
            try {
                const allStats = await getAllStats();
                const stats = currentViewStats || allStats.day;
                const range = currentViewStats ? currentViewRange : "day";
                printReport(stats, range);
            } catch (error) {
                console.error("Error printing stats:", error);
                showToast("Lỗi in thống kê: " + error.message, "error");
            }
        });
    }

    // Xử lý sự kiện in nhanh từ các thẻ thống kê (Ngày, Tuần, Tháng, Năm)
    container.addEventListener("click", async (e) => {
        const printBtn = e.target.closest(".btn-card-print");
        const excelBtn = e.target.closest(".btn-card-excel");

        if (printBtn) {
            const range = printBtn.dataset.range;
            try {
                const allStats = await getAllStats();
                printReport(allStats[range], range);
            } catch (err) {
                showToast("Lỗi in: " + err.message, "error");
            }
        } else if (excelBtn) {
            const range = excelBtn.dataset.range;
            try {
                const allStats = await getAllStats();
                await exportToExcel(allStats[range], range);
            } catch (err) {
                showToast("Lỗi xuất Excel: " + err.message, "error");
            }
        }
    });

    // Handle custom date selection
    const applyCustomDateBtn = container.querySelector("#applyCustomDateBtn");
    if (applyCustomDateBtn) {
        applyCustomDateBtn.addEventListener("click", async () => {
            const dateInput = container.querySelector("#customDateInput");
            const rangeSelect = container.querySelector("#customRangeSelect");
            const categorySelect = container.querySelector("#customCategorySelect");
            
            if (!dateInput.value) {
                showToast("Vui lòng chọn ngày", "warning");
                return;
            }

            try {
                const rangeType = rangeSelect.value || "day";
                const categoryId = categorySelect.value || null;
                const stats = await calculateStats(rangeType, dateInput.value, categoryId);
                
                currentViewStats = stats;
                currentViewRange = rangeType;
                
                const resultLabel = container.querySelector("#resultLabel");
                const resultRevenue = container.querySelector("#resultRevenue");
                const resultOrders = container.querySelector("#resultOrders");
                const resultAvg = container.querySelector("#resultAvg");
                const resultContainer = container.querySelector("#customStatsResult");

                resultLabel.textContent = formatRangeLabel(rangeType, new Date(dateInput.value));
                resultRevenue.textContent = formatCurrency(stats.totalRevenue);
                resultOrders.textContent = `📦 ${stats.completedOrders} đơn`;
                resultAvg.textContent = `Avg: ${formatCurrency(stats.avgOrderValue)}`;
                
                resultContainer.style.display = "block";
                showToast("Cập nhật thống kê thành công!", "success");
            } catch (error) {
                console.error("Error calculating custom stats:", error);
                showToast("Lỗi tính toán thống kê: " + error.message, "error");
            }
        });
    }

    // Set today's date as default
    const dateInput = container.querySelector("#customDateInput");
    if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
    }

    // Tải biểu đồ mặc định cho hôm nay
    try {
        const stats = await getAllStats();
        if (stats.day) {
            await updateCharts(container, stats.day, "day");
        }
    } catch (error) {
        console.error("Error loading initial charts:", error);
    }
}
