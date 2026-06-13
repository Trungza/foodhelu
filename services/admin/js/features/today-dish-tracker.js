import { fetchOrdersByDate, fetchWeeklyMealSchedule, getDishImageUrl, upsertDailyDishStock, fetchAllCategories, fetchDailyDishStockByDate } from "../data/menu-service.js";

const STORAGE_PREFIX = "admin_today_dish_tracker_v1";
const LOW_STOCK_THRESHOLD = 3;
const AUTO_REFRESH_MS = 120000; // 2 phút (giảm tần suất gọi API)
const APPWRITE_PROJECT_ID = "69eb91050034ff637921";
const WEEK_DAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = {
    mon: "Thứ 2",
    tue: "Thứ 3",
    wed: "Thứ 4",
    thu: "Thứ 5",
    fri: "Thứ 6",
    sat: "Thứ 7",
    sun: "Chủ nhật"
};

const PANEL_LOADER_HTML = `
    <div class="panel-loader-overlay">
        <div class="loader-wrapper-small">
            <div class="loader-spinner-small"></div>
            <img src="../customer/img/logo.png" class="loader-logo-small" alt="Logo" onerror="this.style.display='none'">
        </div>
    </div>
`;

function escapeHtml(value) {
    if (!value) return "";
    return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

function toSafeInt(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.round(numeric));
}

function getDateKey(value = new Date()) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getTodayDayId(value = new Date()) {
    return WEEK_DAY_IDS[value.getDay()] || "mon";
}

function normalizeText(value) {
    if (!value) return "";
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function getStorageKey(dateKey) {
    return `${STORAGE_PREFIX}:${dateKey}`;
}

let lastPersistedHash = "";
const lastSyncedItemData = new Map(); // Cache để kiểm tra thay đổi từng món (dishId:dateKey -> hash)

function calculateStateHash(state) {
    const items = state.items || [];
    return `${state.dateKey}|` + items.map(i => `${i.id}:${i.totalQty}:${i.autoSoldQty}:${i.soldAdjustQty}`).join('|');
}

function loadTrackerState(dateKey) {
    const raw = localStorage.getItem(getStorageKey(dateKey));
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        return {
            version: 2,
            dateKey,
            items: items.map((item) => ({
                id: String(item?.id || ""),
                name: item?.name || "Món ăn",
                categoryName: item?.categoryName || "Danh mục",
                imageId: item?.imageId || "",
                totalQty: toSafeInt(item?.totalQty, 0),
                autoSoldQty: 0,
                soldAdjustQty: toSafeInt(
                    item?.soldAdjustQty,
                    toSafeInt(item?.soldQty, 0)
                )
            })).filter((item) => item.id)
        };
    } catch (error) {
        console.error("Không đọc được dữ liệu món hôm nay:", error);
        return null;
    }
}

function saveTrackerState(state) {
    localStorage.setItem(getStorageKey(state.dateKey), JSON.stringify({
        version: 2,
        dateKey: state.dateKey,
        updatedAt: new Date().toISOString(),
        items: state.items.map((item) => ({
            id: item.id,
            name: item.name,
            categoryName: item.categoryName,
            imageId: item.imageId || "",
            totalQty: toSafeInt(item.totalQty, 0),
            soldAdjustQty: toSafeInt(item.soldAdjustQty, 0)
        }))
    }));
}

function getSoldQty(item) {
    return Math.max(0, toSafeInt(item.autoSoldQty, 0) + toSafeInt(item.soldAdjustQty, 0));
}

function getRemainingQty(item) {
    return Math.max(0, toSafeInt(item.totalQty, 0) - getSoldQty(item));
}

function getItemStatus(item) {
    const remainingQty = getRemainingQty(item);
    if (remainingQty <= 0) return "out";
    if (remainingQty <= LOW_STOCK_THRESHOLD) return "low";
    return "ok";
}

function getStatusBadgeText(status, remainingQty) {
    if (remainingQty <= 0 || status === "out") return "Hết món";
    return `Còn ${remainingQty}`;
}

function buildItemsFromSchedule(schedule, todayDayId, categoriesMap = {}) {
    const dishes = Array.isArray(schedule?.dishes) ? schedule.dishes : [];
    const combos = Array.isArray(schedule?.combos) ? schedule.combos : [];
    const byId = new Map();

    dishes
        .filter((entry) => entry?.dayId === todayDayId && entry?.dishId)
        .forEach((entry) => {
            const dishId = String(entry.dishId);
            if (byId.has(dishId)) return;
            const categoryId = entry.categoryId;
            const categoryName = categoriesMap[categoryId] || entry.categoryName || "Danh mục";
            byId.set(dishId, {
                id: dishId,
                name: entry.dishName || "Món ăn",
                categoryId: categoryId,
                categoryName: categoryName,
                imageId: entry.dishImageId || "",
                totalQty: 0,
                autoSoldQty: 0,
                soldAdjustQty: 0
            });
        });

    combos
        .filter((entry) => entry?.dayId === todayDayId)
        .forEach((entry, index) => {
            const comboKey = String(entry.$id || entry.comboId || entry.dishId || `${todayDayId}::${entry.categoryId || "__combo__"}::${entry.name || "Combo"}::${index}`);
            if (byId.has(comboKey)) return;

            const comboItems = Array.isArray(entry.items) ? entry.items : [];
            byId.set(comboKey, {
                id: comboKey,
                name: entry.name || "Combo",
                categoryId: entry.categoryId || "__combo__",
                categoryName: entry.categoryName || "Combo",
                imageId: entry.imageId || comboItems[0]?.imageId || "",
                totalQty: 0,
                autoSoldQty: 0,
                soldAdjustQty: 0,
                isCombo: true,
                comboItems: comboItems.map((item) => ({
                    dishId: item?.dishId || "",
                    dishName: item?.dishName || item?.name || "Món ăn",
                    quantity: toSafeInt(item?.quantity, 1),
                    basePrice: toSafeInt(item?.basePrice, 0),
                    imageId: item?.imageId || ""
                })).filter((item) => item.dishId || item.dishName)
            });
        });

    return Array.from(byId.values()).sort((a, b) => {
        const byCategory = String(a.categoryName).localeCompare(String(b.categoryName));
        if (byCategory !== 0) return byCategory;
        return String(a.name).localeCompare(String(b.name));
    });
}

function buildItemsFromDailyStock(dailyStocks = []) {
    return (dailyStocks || [])
        .filter((stock) => stock?.dishId)
        .map((stock) => ({
            id: String(stock.dishId),
            name: stock.dishName || "Món ăn",
            categoryId: stock.categoryId || "",
            categoryName: stock.categoryName || "Danh mục",
            imageId: stock.dishImageId || "",
            totalQty: toSafeInt(stock.openingQty, 0),
            autoSoldQty: 0,
            soldAdjustQty: toSafeInt(stock.soldAdjustQty, 0)
        }))
        .sort((a, b) => {
            const byCategory = String(a.categoryName).localeCompare(String(b.categoryName));
            if (byCategory !== 0) return byCategory;
            return String(a.name).localeCompare(String(b.name));
        });
}

function mergeWithDailyStock(baseItems, dailyStocksById) {
    return baseItems.map((item) => {
        const stock = dailyStocksById.get(String(item.id)) || null;
        if (!stock) return item;
        return {
            ...item,
            name: stock.dishName || item.name,
            categoryName: stock.categoryName || item.categoryName,
            imageId: stock.dishImageId || item.imageId,
            totalQty: toSafeInt(stock.openingQty, item.totalQty),
            soldAdjustQty: toSafeInt(stock.soldAdjustQty, item.soldAdjustQty)
        };
    });
}

function mergeWithPersisted(baseItems, persistedState) {
    const persistedMap = new Map((persistedState?.items || []).map((item) => [item.id, item]));
    return baseItems.map((item) => {
        const oldItem = persistedMap.get(item.id);
        if (!oldItem) return item;
        return {
            ...item,
            totalQty: toSafeInt(oldItem.totalQty, 0),
            soldAdjustQty: toSafeInt(oldItem.soldAdjustQty, 0)
        };
    });
}

function formatDayLabel(now = new Date()) {
    const dayId = getTodayDayId(now);
    const dayLabel = DAY_LABELS[dayId] || "Hôm nay";
    const dateLabel = now.toLocaleDateString("vi-VN");
    return `${dayLabel}, ${dateLabel}`;
}

function normalizeCategoryKey(value) {
    const raw = String(value || "").trim();
    return raw || "__uncategorized__";
}

function isComboCategory(value) {
    return normalizeText(value) === "combo";
}

function groupItemsByCategory(items) {
    const grouped = new Map();
    (items || []).forEach((item) => {
        const key = normalizeCategoryKey(item.categoryName);
        if (!grouped.has(key)) {
            grouped.set(key, {
                name: item.categoryName || "Không phân loại",
                items: []
            });
        }
        grouped.get(key).items.push(item);
    });
    return Array.from(grouped.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function renderComboItemsSummary(comboItems = []) {
    if (!Array.isArray(comboItems) || !comboItems.length) return "";

    return `
        <div class="today-dish-combo-summary">
            <span class="today-dish-combo-summary-label">Combo:</span>
            <ul>
                ${comboItems.map((item) => {
                    const qty = toSafeInt(item?.quantity, 1);
                    const name = escapeHtml(item?.dishName || "Món ăn");
                    return `<li>${name} x${qty}</li>`;
                }).join("")}
            </ul>
        </div>
    `;
}

function renderOrdersPanel(root, state) {
    const panel = root.querySelector("#todayDishOrdersPanel");
    const listHost = root.querySelector("#todayDishOrdersList");
    const metaHost = root.querySelector("#todayDishOrdersMeta");
    if (!panel || !listHost) return;

    if (metaHost) {
        const syncLabel = state.lastSyncedAt
            ? `Đồng bộ ${new Date(state.lastSyncedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
            : "Chưa đồng bộ đơn";
        metaHost.innerHTML = `
            <span>${formatDayLabel()} | ${syncLabel}</span>
            <button type="button" class="today-dish-refresh-btn" title="Tải lại thực đơn">
                <i class="fas fa-sync-alt"></i>
            </button>
        `;
    }

    const items = state.items || [];
    if (!items.length) {
        listHost.innerHTML = `<div class="empty-state">Không có món trong lịch hôm nay.</div>`;
        return;
    }

    const groups = groupItemsByCategory(items);
    if (!groups.length) {
        listHost.innerHTML = `<div class="empty-state">Không có món trong lịch hôm nay.</div>`;
        return;
    }

    const firstGroupKey = normalizeCategoryKey(groups[0]?.name);
    if (!state.activeCategoryKey || !groups.some((group) => normalizeCategoryKey(group.name) === state.activeCategoryKey)) {
        state.activeCategoryKey = firstGroupKey;
    }

    const tabsHtml = groups.map((group) => {
        const key = normalizeCategoryKey(group.name);
        const isActive = key === state.activeCategoryKey;
        const count = group.items.length;
        return `
            <button
                type="button"
                class="today-dish-category-tab ${isActive ? "active" : ""}"
                data-category-key="${escapeHtml(key)}"
                aria-selected="${isActive ? "true" : "false"}"
            >
                ${escapeHtml(group.name)} <span class="category-count">(${count})</span>
            </button>
        `;
    }).join("");

    const panelsHtml = groups.map((group) => {
        const key = normalizeCategoryKey(group.name);
        const isActive = key === state.activeCategoryKey;
        const isComboTab = isComboCategory(group.name) || isComboCategory(key);

        const rowsHtml = group.items.map((item) => {
            const status = getItemStatus(item);
            const remainingQty = getRemainingQty(item);
            const statusText = getStatusBadgeText(status, remainingQty);
            const imageUrl = item.imageId ? getDishImageUrl(item.imageId, APPWRITE_PROJECT_ID) : "";
            const imageHtml = imageUrl
                ? `<img src="${imageUrl}" alt="${escapeHtml(item.name)}" class="today-dish-track-thumb" />`
                : `<span class="today-dish-track-thumb-placeholder">N/A</span>`;
            const comboBadgeHtml = item?.isCombo
                ? `<span class="today-dish-track-combo-badge">Combo</span>`
                : "";
            const comboSummaryHtml = item?.isCombo ? renderComboItemsSummary(item.comboItems) : "";
            const controlsHtml = isComboTab
                ? ""
                : `
                    <div class="today-dish-track-controls">
                        <label>
                            Còn lại
                            <input type="number" min="0" step="1" class="today-dish-remaining-input" data-dish-id="${escapeHtml(item.id)}" value="${remainingQty}" />
                        </label>
                        <span class="today-dish-status-pill ${status}">${statusText}</span>
                    </div>
                `;

            return `
                <article class="today-dish-track-item" data-dish-id="${escapeHtml(item.id)}">
                    <div class="today-dish-track-main">
                        <div class="today-dish-track-thumb-wrap">${imageHtml}</div>
                        <div class="today-dish-track-title-wrap">
                            <div class="today-dish-track-title-row">
                                <strong>${escapeHtml(item.name)}</strong>
                                ${comboBadgeHtml}
                            </div>
                            ${comboSummaryHtml}
                        </div>
                    </div>
                    ${controlsHtml}
                </article>
            `;
        }).join("");

        return `
            <section class="today-dish-category-panel ${isActive ? "active" : ""}" data-category-panel="${escapeHtml(key)}">
                <div class="today-dish-category-items">${rowsHtml}</div>
            </section>
        `;
    }).join("");

    listHost.innerHTML = `
        <div class="today-dish-category-tabs" role="tablist" aria-label="Danh mục món hôm nay">
            ${tabsHtml}
        </div>
        <div class="today-dish-category-panels">
            ${panelsHtml}
        </div>
    `;
}

function renderAll(root, state) {
    renderOrdersPanel(root, state);
}

async function persistStateToDailyStock(state) {
    const dateKey = state?.dateKey || getDateKey(new Date());
    const dayId = state?.dayId || getTodayDayId(new Date());
    const items = Array.isArray(state?.items) ? state.items : [];

    if (!items.length) return;

    // 1. Kiểm tra nhanh toàn bộ state: Nếu hash không đổi thì không cần làm gì
    const currentHash = calculateStateHash(state);
    if (currentHash === lastPersistedHash) return;

    // 2. Tối ưu: Chạy song song (Promise.all) và chỉ thực hiện API call cho những món có thay đổi dữ liệu
    const promises = items.map(async (item) => {
        const soldAutoQty = toSafeInt(item.autoSoldQty, 0);
        const soldAdjustQty = toSafeInt(item.soldAdjustQty, 0);
        const remainingQty = getRemainingQty(item);
        const openingQty = soldAutoQty + soldAdjustQty + remainingQty;
        const isAvailable = remainingQty > 0;

        // Dirty check: Tạo hash cho dữ liệu quan trọng của món này
        const itemKey = `${item.id}:${dateKey}`;
        const itemDataHash = `${openingQty}|${soldAutoQty}|${soldAdjustQty}|${remainingQty}|${isAvailable}`;

        // Nếu dữ liệu món này trùng với lần đồng bộ trước đó thì bỏ qua để giảm API call
        if (lastSyncedItemData.get(itemKey) === itemDataHash) return;

        try {
            await upsertDailyDishStock({
                dateKey,
                dayId,
                dishId: item.id,
                dishName: item.name || "Món ăn",
                categoryName: item.categoryName || "Danh mục",
                dishImageId: item.imageId || "",
                openingQty,
                soldAutoQty,
                soldAdjustQty,
                remainingQty,
                isAvailable
            });
            // Lưu lại hash sau khi sync thành công
            lastSyncedItemData.set(itemKey, itemDataHash);
        } catch (error) {
            console.warn(`Không thể đồng bộ món ${item.id}:`, error);
        }
    });

    await Promise.all(promises);
    lastPersistedHash = currentHash;
}

function getItemById(state, dishId) {
    return state.items.find((item) => item.id === dishId) || null;
}

function setRemainingQty(state, dishId, remainingQty) {
    const item = getItemById(state, dishId);
    if (!item) return false;
    const soldQty = getSoldQty(item);
    const normalizedRemainingQty = toSafeInt(remainingQty, 0);
    item.totalQty = soldQty + normalizedRemainingQty;
    return true;
}

function normalizeLocalOrder(order, index) {
    const rawItems = Array.isArray(order?.items) ? order.items : [];
    const items = rawItems.map((item) => ({
        dishId: item?.dishId || item?.id || "",
        dishName: item?.dishName || item?.name || "",
        quantity: Number.isFinite(Number(item?.quantity)) ? Math.max(1, Math.round(Number(item.quantity))) : 1
    })).filter((item) => item.dishId || item.dishName);

    return {
        id: order?.id || order?.orderId || `local_${index}`,
        status: order?.status || "",
        createdAt: order?.date || order?.createdAt || "",
        items
    };
}

function loadLocalOrdersForDate(dateKey) {
    const raw = localStorage.getItem("orders");
    if (!raw) return [];

    try {
        const orders = JSON.parse(raw);
        if (!Array.isArray(orders)) return [];
        return orders
            .map((order, index) => normalizeLocalOrder(order, index))
            .filter((order) => order.createdAt && getDateKey(new Date(order.createdAt)) === dateKey);
    } catch (error) {
        console.error("Không đọc được local orders:", error);
        return [];
    }
}

function isCountableOrderStatus(status) {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) return true;
    if (normalized.includes("cancel")) return false;
    if (normalized.includes("reject")) return false;
    if (normalized.includes("void")) return false;
    if (normalized.includes("refund")) return false;
    if (normalized.includes("failed")) return false;
    return true;
}

function buildSoldMapsFromOrders(orders) {
    const soldByDishId = new Map();
    const soldByDishName = new Map();

    (orders || []).forEach((order) => {
        if (!isCountableOrderStatus(order?.status)) return;
        const items = Array.isArray(order?.items) ? order.items : [];
        items.forEach((item) => {
            const quantity = Number.isFinite(Number(item?.quantity)) ? Math.max(1, Math.round(Number(item.quantity))) : 1;
            const dishId = String(item?.dishId || "").trim();
            const dishNameKey = normalizeText(item?.dishName || "");

            if (dishId) {
                const current = soldByDishId.get(dishId) || 0;
                soldByDishId.set(dishId, current + quantity);
            }
            if (dishNameKey) {
                const current = soldByDishName.get(dishNameKey) || 0;
                soldByDishName.set(dishNameKey, current + quantity);
            }
        });
    });

    return { soldByDishId, soldByDishName };
}

function applyAutoSoldToState(state, soldMaps) {
    const soldByDishId = soldMaps?.soldByDishId || new Map();
    const soldByDishName = soldMaps?.soldByDishName || new Map();

    state.items.forEach((item) => {
        const byId = soldByDishId.get(String(item.id)) || null;
        const byName = soldByDishName.get(normalizeText(item.name)) || 0;
        item.autoSoldQty = toSafeInt(byId ?? byName, 0);
    });
}

async function loadOrdersFromSources(now, dateKey) {
    let apiOrders = [];
    try {
        apiOrders = await fetchOrdersByDate(now);
    } catch (error) {
        console.error("Không tải được orders từ API:", error);
    }

    const localOrders = loadLocalOrdersForDate(dateKey);
    const deduped = [];
    const seen = new Set();

    [...apiOrders, ...localOrders].forEach((order, index) => {
        const keyBase = String(order?.id || "").trim();
        const key = keyBase ? `id:${keyBase}` : `idx:${index}:${order?.createdAt || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(order);
    });

    return deduped;
}

// Debounce timer
let debounceTimer = null;

export async function initTodayDishTracker(root) {
    const ordersHost = root.querySelector("#todayDishOrdersList");
    if (!ordersHost) return;

    // Hiển thị hiệu ứng loading cục bộ cho bảng danh sách
    ordersHost.style.position = 'relative';
    ordersHost.insertAdjacentHTML('afterbegin', PANEL_LOADER_HTML);

    const skipListeners = root.dataset.todayDishTrackerInit === "1";
    root.dataset.todayDishTrackerInit = "1";

    const now = new Date();
    const todayDayId = getTodayDayId(now);
    const dateKey = getDateKey(now);
    const persistedState = loadTrackerState(dateKey);

    const state = {
        version: 2,
        dateKey,
        dayId: todayDayId,
        lastSyncedAt: null,
        activeCategoryKey: null,
        items: []
    };

    try {
        const categories = await fetchAllCategories(1000);
        const categoriesMap = {};
        categories.forEach(cat => { categoriesMap[cat.$id] = cat.name; });

        const schedule = await fetchWeeklyMealSchedule();
        const scheduleItems = buildItemsFromSchedule(schedule, todayDayId, categoriesMap);
        const dailyStocks = await fetchDailyDishStockByDate(dateKey);
        console.log("Daily Stocks:", dailyStocks);

        if (scheduleItems.length > 0) {
            const scheduleDishIds = new Set(scheduleItems.map((item) => String(item.id || "")));
            const relevantDailyStocks = (dailyStocks || []).filter((stock) => scheduleDishIds.has(String(stock.dishId || "")));
            const relevantDailyStocksById = new Map(relevantDailyStocks.map((stock) => [String(stock.dishId || ""), stock]));

            if (relevantDailyStocks.length > 0) {
                state.items = mergeWithDailyStock(scheduleItems, relevantDailyStocksById);
                
                // Khởi tạo cache từ dữ liệu DB vừa tải để tránh việc persist lại ngay lập tức
                relevantDailyStocks.forEach(stock => {
                    const itemKey = `${stock.dishId}:${dateKey}`;
                    const hash = `${stock.openingQty}|${stock.soldAutoQty}|${stock.soldAdjustQty}|${stock.remainingQty}|${stock.isAvailable}`;
                    lastSyncedItemData.set(itemKey, hash);
                });
            } else {
                state.items = mergeWithPersisted(scheduleItems, persistedState);
            }
        } else {
            localStorage.removeItem(getStorageKey(dateKey));
            state.items = [];
        }
    } catch (error) {
        console.error("Không tải được lịch món hôm nay:", error);
        state.items = persistedState?.items || [];
    } finally {
        const loader = ordersHost.querySelector('.panel-loader-overlay');
        if (loader) loader.remove();
    }

    const syncOrdersAndRender = async () => {
        const current = new Date();
        if (getDateKey(current) !== state.dateKey) return;
        const orders = await loadOrdersFromSources(current, state.dateKey);
        const soldMaps = buildSoldMapsFromOrders(orders);
        applyAutoSoldToState(state, soldMaps);
        state.lastSyncedAt = new Date().toISOString();
        saveTrackerState(state);
        try {
            await persistStateToDailyStock(state);
        } catch (error) {
            console.error("Không đồng bộ được daily_stock:", error);
        }
        renderAll(root, state);
    };

    saveTrackerState(state);
    renderAll(root, state);
    await syncOrdersAndRender();

    if (skipListeners) return;

    // Xử lý nút Tải lại thủ công
    root.addEventListener("click", async (event) => {
        const refreshBtn = event.target.closest(".today-dish-refresh-btn");
        if (refreshBtn) {
            try {
                refreshBtn.classList.add("spinning");
                // Hiện hiệu ứng loading khi tải lại thủ công
                ordersHost.insertAdjacentHTML('afterbegin', PANEL_LOADER_HTML);
                
                // 1. Tải lại Lịch ăn và Danh mục từ DB
                const [categories, schedule] = await Promise.all([
                    fetchAllCategories(1000),
                    fetchWeeklyMealSchedule()
                ]);

                const categoriesMap = {};
                categories.forEach(cat => { categoriesMap[cat.$id] = cat.name; });

                // 2. Tải lại Tồn kho thực tế
                const dailyStocks = await fetchDailyDishStockByDate(state.dateKey);
                
                // 3. Xây dựng lại danh sách món dựa trên lịch mới
                const scheduleItems = buildItemsFromSchedule(schedule, state.dayId, categoriesMap);

                if (scheduleItems.length > 0) {
                    const scheduleDishIds = new Set(scheduleItems.map((item) => String(item.id || "")));
                    const relevantDailyStocksById = new Map(
                        (dailyStocks || [])
                            .filter((stock) => scheduleDishIds.has(String(stock.dishId || "")))
                            .map((stock) => [String(stock.dishId || ""), stock])
                    );

                    // Cập nhật lại state items của tracker
                    state.items = mergeWithDailyStock(scheduleItems, relevantDailyStocksById);
                } else {
                    state.items = [];
                }

                // 4. Đồng bộ đơn hàng và vẽ lại giao diện
                await syncOrdersAndRender();
                console.log("Đã tải lại lịch ăn hôm nay từ Database.");

                // Cập nhật lại cache sau khi tải mới thủ công
                relevantDailyStocksById.forEach((stock) => {
                    const itemKey = `${stock.dishId}:${state.dateKey}`;
                    const hash = `${stock.openingQty}|${stock.soldAutoQty}|${stock.soldAdjustQty}|${stock.remainingQty}|${stock.isAvailable}`;
                    lastSyncedItemData.set(itemKey, hash);
                });

            } catch (err) {
                console.error("Lỗi khi tải lại lịch ăn:", err);
            } finally {
                refreshBtn.classList.remove("spinning");
                const loader = ordersHost.querySelector('.panel-loader-overlay');
                if (loader) loader.remove();
            }
        }
    });

    // Sự kiện thay đổi số lượng (có debounce)
    root.addEventListener("change", (event) => {
        const remainingInput = event.target.closest(".today-dish-remaining-input");
        if (!remainingInput) return;

        const dishId = remainingInput.dataset.dishId || "";
        if (!dishId) return;

        const updated = setRemainingQty(state, dishId, remainingInput.value);
        if (!updated) return;

        saveTrackerState(state);
        renderAll(root, state);

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const item = state.items.find(i => i.id === dishId);
            if (item) {
                const soldAutoQty = toSafeInt(item.autoSoldQty, 0);
                const soldAdjustQty = toSafeInt(item.soldAdjustQty, 0);
                const remainingQty = getRemainingQty(item);
                const openingQty = soldAutoQty + soldAdjustQty + remainingQty;
                try {
                    await upsertDailyDishStock({
                        dateKey: state.dateKey,
                        dayId: state.dayId,
                        dishId: item.id,
                        dishName: item.name,
                        categoryName: item.categoryName,
                        dishImageId: item.imageId || "",
                        openingQty,
                        soldAutoQty,
                        soldAdjustQty,
                        remainingQty,
                        isAvailable: remainingQty > 0
                    });
                    // Cập nhật cache ngay khi lưu thành công thay đổi thủ công
                    const itemKey = `${item.id}:${state.dateKey}`;
                    const hash = `${openingQty}|${soldAutoQty}|${soldAdjustQty}|${remainingQty}|${remainingQty > 0}`;
                    lastSyncedItemData.set(itemKey, hash);
                } catch (error) {
                    console.warn(`Không thể đồng bộ món ${item.id}:`, error);
                }
            }
        }, 500);
    });

    // Sự kiện chuyển tab category
    root.addEventListener("click", (event) => {
        const tabButton = event.target.closest(".today-dish-category-tab");
        if (!tabButton) return;
        const categoryKey = tabButton.dataset.categoryKey || "";
        if (!categoryKey || state.activeCategoryKey === categoryKey) return;
        state.activeCategoryKey = categoryKey;
        renderAll(root, state);
    });

    window.setInterval(() => {
        void syncOrdersAndRender();
    }, AUTO_REFRESH_MS);

    window.addEventListener("focus", () => {
        const lastSyncTime = state.lastSyncedAt ? new Date(state.lastSyncedAt).getTime() : 0;
        if (Date.now() - lastSyncTime > 15000) {
            void syncOrdersAndRender();
        }
    });
}