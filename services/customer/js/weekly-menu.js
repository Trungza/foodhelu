// WEEKLY-MENU.JS
import { APPWRITE_CONFIG, DB } from "../../shared/js/config.js";
import { databases, Query, DATABASE_ID } from "../../shared/js/appwrite.js";

const WEEKLY_SCHEDULES_COLLECTION_ID = DB.COLLECTIONS.WEEKLY_SCHEDULES;
const BUCKET_ID = APPWRITE_CONFIG.BUCKET_ID;
const PROJECT_ID = APPWRITE_CONFIG.PROJECT_ID;

const dayMapping = {
    mon: { key: "monday", label: "Thứ Hai" },
    tue: { key: "tuesday", label: "Thứ Ba" },
    wed: { key: "wednesday", label: "Thứ Tư" },
    thu: { key: "thursday", label: "Thứ Năm" },
    fri: { key: "friday", label: "Thứ Sáu" },
    sat: { key: "saturday", label: "Thứ Bảy" },
    sun: { key: "sunday", label: "Chủ Nhật" }
};

let weeklyData = {};

let weeklyOrders = {};

// Thêm CSS cho Skeleton vào Head
if (!document.getElementById('skeleton-styles')) {
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = `
        .skeleton { background: #1e293b; position: relative; overflow: hidden; }
        .skeleton::after {
            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
            animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-box { border-radius: 8px; }
        .skeleton-text { height: 14px; border-radius: 4px; margin-bottom: 8px; width: 80%; }
        .skeleton-text.short { width: 40%; }
        
        .fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Lightbox Styles */
        .dish-lightbox {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); backdrop-filter: blur(5px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; opacity: 0; visibility: hidden;
            transition: all 0.3s ease;
        }
        .dish-lightbox.active { opacity: 1; visibility: visible; }
        .dish-lightbox-content {
            max-width: 90%; max-height: 80%; position: relative;
            transform: scale(0.8); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dish-lightbox.active .dish-lightbox-content { transform: scale(1); }
        .dish-lightbox-img { 
            max-width: 100%; max-height: 80vh; object-fit: contain;
            border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); 
        }
        .dish-lightbox-close {
            position: absolute; top: -45px; right: -10px; color: white;
            font-size: 40px; cursor: pointer; background: none; border: none;
        }
        .dish-lightbox-caption {
            color: white; text-align: center; margin-top: 15px; font-weight: 600; font-size: 1.2rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
    `;
    document.head.appendChild(style);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function toWeekId(value = new Date()) {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getDishImageUrl(imageId) {
    if (!imageId) return "";
    return `https://fra.cloud.appwrite.io/v1/storage/buckets/${APPWRITE_CONFIG.BUCKET_ID}/files/${imageId}/view?project=${APPWRITE_CONFIG.PROJECT_ID}`;
}

function initWeeklyOrders() {
    Object.values(dayMapping).forEach(day => {
        weeklyOrders[day.key] = [];
    });
}

function displayWeeklyPanels(isLoading = false) {
    const container = document.getElementById('weeklyPanels');
    if (!container) return;

    let panelsHtml = '';
    const sortedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const skeletonCount = 3; // Số lượng card giả lập

    for (const dayKey of sortedDays) {
        const dayData = weeklyData[dayKey] || { dayName: dayMapping[Object.keys(dayMapping).find(k => dayMapping[k].key === dayKey)]?.label || dayKey, categories: {} };
        
        // Nếu đang load, ta tạo dữ liệu giả cho category "loading"
        let categoryKeys = Object.keys(dayData.categories);
        
        if (isLoading) {
            categoryKeys = ['loading'];
        } else if (categoryKeys.length === 0) {
            // Nếu không có dữ liệu thật và không phải đang load, ta có thể bỏ qua hoặc hiện thông báo trống
            panelsHtml += `
            <div class="weekly-panel" data-day="${dayKey}">
            <div class="panel-header"><h3 class="panel-title">Thực đơn ${dayData.dayName}</h3></div>
            <div class="no-data-msg" style="padding: 40px; text-align: center; color: #94a3b8;">Ngày này chưa có thực đơn.</div>
            </div>`;
            continue;
        }
        
        
        panelsHtml += `
            <div class="weekly-panel" data-day="${dayKey}">
                <div class="panel-header">
                    <h3 class="panel-title">Thực đơn ${dayData.dayName}</h3>
                </div>

                <div class="inner-tabs" id="innerTabs-${dayKey}">
                    ${categoryKeys.map((cat, idx) => `
                            <button class="inner-tab-btn ${idx === 0 ? 'active' : ''}" data-day="${dayKey}" data-category="${cat}">
                                ${isLoading ? 'Đang tải...' : escapeHtml(dayData.categories[cat][0]?.categoryName || cat)}
                            </button>
                        `).join('')}
                </div>

                <div class="inner-panels" id="innerPanels-${dayKey}">
                    ${categoryKeys.map((cat, idx) => `
                        <div class="inner-panel ${idx === 0 ? 'active' : ''}" data-day="${dayKey}" data-category="${cat}">
                            <div class="inner-dishes-grid ${!isLoading ? 'fade-in' : ''}">
                                ${isLoading ? Array(skeletonCount).fill(0).map(() => `
                                    <div class="inner-dish-card skeleton-box" style="border: 1px solid #334155;">
                                        <div class="inner-dish-image skeleton"></div>
                                        <div class="inner-dish-info">
                                            <div class="inner-dish-name skeleton skeleton-text"></div>
                                            <div class="inner-dish-desc skeleton skeleton-text" style="width: 60%"></div>
                                        </div>
                                        <div class="inner-dish-price skeleton skeleton-text short"></div>
                                    </div>
                                 `).join('') : 
                                 (dayData.categories[cat] || []).map(dish => `
                                     <div class="inner-dish-card">
                                         <div class="inner-dish-image" onclick="openDishLightbox('${escapeHtml(dish.image)}', '${escapeHtml(dish.name)}')">
                                             <img src="${escapeHtml(dish.image) || ''}" 
                                                  alt="${escapeHtml(dish.name)}" 
                                                  style="cursor: zoom-in;"
                                                  onerror="this.src=''">
                                         </div>
                                        <div class="inner-dish-info">
                                            <div class="inner-dish-name">${escapeHtml(dish.name)}</div>
                                            <div class="inner-dish-desc">${escapeHtml(dish.description)}</div>
                                        </div>
                                        <div class="inner-dish-price">${Number(dish.price || 0).toLocaleString("vi-VN")}đ</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

     container.innerHTML = panelsHtml;
     setupInnerTabs();
}

 function setActiveWeeklyTab(dayKey) {
    document.querySelectorAll('.weekly-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-day') === dayKey);
    });
    document.querySelectorAll('.weekly-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.getAttribute('data-day') === dayKey);
    });
}

function setActiveInnerTab(dayKey, categoryKey) {
    const panel = document.querySelector(`.weekly-panel[data-day="${dayKey}"]`);
    if (!panel) return;

    const tabs = panel.querySelectorAll('.inner-tab-btn');
    const panels = panel.querySelectorAll('.inner-panel');

    tabs.forEach((t) => t.classList.toggle('active', t.getAttribute('data-category') === categoryKey));
    panels.forEach((p) => p.classList.toggle('active', p.getAttribute('data-category') === categoryKey));
}

 function getCurrentActiveContext() {
     const activeDay = document.querySelector('.weekly-tab-btn.active')?.getAttribute('data-day') || 'monday';
     const activePanel = document.querySelector(`.weekly-panel[data-day="${activeDay}"]`);
     const activeCategory = activePanel?.querySelector('.inner-tab-btn.active')?.getAttribute('data-category') || '';
     return { activeDay, activeCategory };
 }

function setupInnerTabsForPanel(panel) {
    if (!panel) return;

    const innerTabs = panel.querySelectorAll('.inner-tab-btn');
    const innerPanels = panel.querySelectorAll('.inner-panel');

    innerTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const category = tab.getAttribute('data-category');

            innerTabs.forEach((t) => t.classList.remove('active'));
            innerPanels.forEach((p) => p.classList.remove('active'));

            tab.classList.add('active');
            const activePanel = panel.querySelector(`.inner-panel[data-category="${category}"]`);
            if (activePanel) activePanel.classList.add('active');
        });
    });
}

function rebuildWeeklyDayPanel(dayKey) {
    const panel = document.querySelector(`.weekly-panel[data-day="${dayKey}"]`);
    if (!panel) return;

    const dayData = weeklyData[dayKey] || { dayName: dayKey, categories: {} };
    const categoryKeys = Object.keys(dayData.categories);

    if (categoryKeys.length === 0) {
        panel.innerHTML = `
            <div class="panel-header"><h3 class="panel-title">Thuc don ${escapeHtml(dayData.dayName)}</h3></div>
            <div class="no-data-msg" style="padding: 40px; text-align: center; color: #94a3b8;">Ngay nay chua co thuc don.</div>
        `;
        return;
    }

    panel.innerHTML = `
        <div class="panel-header">
            <h3 class="panel-title">Thuc don ${escapeHtml(dayData.dayName)}</h3>
        </div>

        <div class="inner-tabs" id="innerTabs-${escapeHtml(dayKey)}">
            ${categoryKeys.map((cat, idx) => `
                <button class="inner-tab-btn ${idx === 0 ? 'active' : ''}" data-day="${escapeHtml(dayKey)}" data-category="${escapeHtml(cat)}">
                    ${escapeHtml(dayData.categories[cat]?.[0]?.categoryName || cat)}
                </button>
            `).join('')}
        </div>

        <div class="inner-panels" id="innerPanels-${escapeHtml(dayKey)}">
            ${categoryKeys.map((cat, idx) => `
                <div class="inner-panel ${idx === 0 ? 'active' : ''}" data-day="${escapeHtml(dayKey)}" data-category="${escapeHtml(cat)}">
                    <div class="inner-dishes-grid fade-in">
                        ${(dayData.categories[cat] || []).map(dish => `
                             <div class="inner-dish-card">
                                 <div class="inner-dish-image" onclick="openDishLightbox('${escapeHtml(dish.image)}', '${escapeHtml(dish.name)}')">
                                     <img src="${escapeHtml(dish.image) || ''}"
                                          alt="${escapeHtml(dish.name)}"
                                          style="cursor: zoom-in;"
                                          onerror="this.src=''">
                                 </div>
                                <div class="inner-dish-info">
                                    <div class="inner-dish-name">${escapeHtml(dish.name)}</div>
                                    <div class="inner-dish-desc">${escapeHtml(dish.description)}</div>
                                </div>
                                <div class="inner-dish-price">${Number(dish.price || 0).toLocaleString("vi-VN")}d</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    setupInnerTabsForPanel(panel);
}



async function loadWeeklyMenuFromAppwrite() {
    if (!databases) return;

    // Hiển thị Skeleton ngay khi bắt đầu gọi API
    displayWeeklyPanels(true);

    try {
        const weekId = toWeekId(new Date());
        
        // Lấy snapshot lịch trình và danh sách combo từ DB
        const [scheduleRes, comboRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, WEEKLY_SCHEDULES_COLLECTION_ID, [Query.equal("weekId", weekId), Query.limit(1)]),
            databases.listDocuments(DATABASE_ID, DB.COLLECTIONS.COMBOS, [Query.equal("weekId", weekId), Query.limit(100)])
        ]);

        const doc = scheduleRes.documents[0] || null;
        const schedule = doc ? JSON.parse(doc.scheduleJson) : { dishes: [], combos: [] };
        const comboDocs = comboRes.documents || [];
        
        const newWeeklyData = {};
        Object.values(dayMapping).forEach(d => {
            newWeeklyData[d.key] = { dayName: d.label, categories: {} };
        });

        // 1. Xử lý Món lẻ từ schedule snapshot
        const dishes = Array.isArray(schedule.dishes) ? schedule.dishes : [];
        dishes.forEach(item => {
            const dayMeta = dayMapping[item.dayId];
            if (!dayMeta) return;

            const catKey = item.categoryId;
            if (!newWeeklyData[dayMeta.key].categories[catKey]) {
                newWeeklyData[dayMeta.key].categories[catKey] = [];
            }

            newWeeklyData[dayMeta.key].categories[catKey].push({
                id: item.dishId,
                name: item.dishName,
                categoryName: item.categoryName,
                description: "Món ăn lẻ",
                price: item.priceOverride || item.basePrice,
                image: getDishImageUrl(item.dishImageId || item.imageId)
            });
        });

        // 2. Xử lý Combo lấy trực tiếp từ DB combo_items
        await Promise.all(comboDocs.map(async (combo) => {
            const dayMeta = dayMapping[combo.dayId];
            if (!dayMeta) return;

            // Lấy chi tiết món ăn trong combo từ collection combo_items
            const itemsRes = await databases.listDocuments(DATABASE_ID, DB.COLLECTIONS.COMBO_ITEMS, [
                Query.equal("comboId", combo.$id),
                Query.limit(50)
            ]);
            const items = itemsRes.documents || [];
            
            const catKey = "Combo";
            if (!newWeeklyData[dayMeta.key].categories[catKey]) {
                newWeeklyData[dayMeta.key].categories[catKey] = [];
            }

            const description = items.map(i => `${i.dishName} x${i.quantity}`).join(", ");

            newWeeklyData[dayMeta.key].categories[catKey].push({
                id: combo.$id,
                name: combo.name,
                categoryName: "Combo",
                description: description || "Combo đặc biệt",
                price: combo.priceOverride || combo.price,
                image: getDishImageUrl(items[0]?.dishImageId || items[0]?.imageId || "")
            });
        }));

        weeklyData = newWeeklyData;
        displayWeeklyPanels();
        setupWeeklyTabs();
        
        const sortedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

        // Logic: Tìm ngày đầu tiên trong tuần có dữ liệu món ăn
        const firstAvailableDay = sortedDays.find(day => 
            newWeeklyData[day] && Object.values(newWeeklyData[day].categories).some(catItems => catItems.length > 0)
        );

        const targetDay = firstAvailableDay || "monday"; // Fallback về thứ 2 nếu rỗng hết

        // Cập nhật class active cho Tab và Panel
        document.querySelectorAll('.weekly-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-day') === targetDay);
        });

        const activePanel = document.querySelector(`.weekly-panel[data-day="${targetDay}"]`);
        if (activePanel) {
            document.querySelectorAll('.weekly-panel').forEach(p => p.classList.remove('active'));
            activePanel.classList.add('active');
        }
    } catch (error) {
        console.error("Lỗi khi tải thực đơn tuần:", error);
    }
}


function setupInnerTabs() {
    const panels = document.querySelectorAll('.weekly-panel');

    panels.forEach(panel => {
        const innerTabs = panel.querySelectorAll('.inner-tab-btn');
        const innerPanels = panel.querySelectorAll('.inner-panel');

        innerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.getAttribute('data-category');

                innerTabs.forEach(t => t.classList.remove('active'));
                innerPanels.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const activePanel = panel.querySelector(`.inner-panel[data-category="${category}"]`);
                if (activePanel) activePanel.classList.add('active');
            });
        });
    });
}

function setupWeeklyTabs() {
    const tabs = document.querySelectorAll('.weekly-tab-btn');
    const panels = document.querySelectorAll('.weekly-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const day = tab.getAttribute('data-day');

            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const activePanel = document.querySelector(`.weekly-panel[data-day="${day}"]`);
            if (activePanel) activePanel.classList.add('active');
        });
    });
}

function updateWeeklySummary() {
    const summaryList = document.getElementById('summaryList');
    const totalPriceSpan = document.getElementById('weeklyTotalPrice');

    if (!summaryList) return;

    summaryList.innerHTML = '<p class="no-orders">Tính năng đặt món theo tuần đang được phát triển</p>';
    totalPriceSpan.textContent = '0đ';
}

/**
 * Hiển thị ảnh món ăn phóng to (Lightbox)
 */
export function openDishLightbox(src, name) {
    if (!src || src === "" || src.includes('placeholder')) return;
    
    let lightbox = document.getElementById('dishLightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'dishLightbox';
        lightbox.className = 'dish-lightbox';
        lightbox.innerHTML = `
            <div class="dish-lightbox-content">
                <button class="dish-lightbox-close" title="Đóng">&times;</button>
                <img class="dish-lightbox-img" src="" alt="">
                <div class="dish-lightbox-caption"></div>
            </div>
        `;
        document.body.appendChild(lightbox);
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('dish-lightbox-close')) {
                lightbox.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    const img = lightbox.querySelector('.dish-lightbox-img');
    const caption = lightbox.querySelector('.dish-lightbox-caption');
    
    img.src = src;
    img.alt = name;
    caption.textContent = name;
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Expose function to window for onclick handlers in template
window.openDishLightbox = openDishLightbox;

function initWeeklyMenu() {
    console.log('Khởi tạo thực đơn tuần...');
    initWeeklyOrders();
    loadWeeklyMenuFromAppwrite();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeeklyMenu);
} else {
    initWeeklyMenu();
}
