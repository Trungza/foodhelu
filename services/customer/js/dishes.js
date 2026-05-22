﻿﻿﻿﻿﻿﻿// DISHES.JS - LOAD REAL DATA FROM APPWRITE
import { APPWRITE_CONFIG, DB } from "../../shared/js/config.js";
import { databases, Query, DATABASE_ID, BUCKET_ID } from "../../shared/js/appwrite.js";

const CATEGORIES_COLLECTION_ID = DB.COLLECTIONS.CATEGORIES;
const DISHES_COLLECTION_ID = DB.COLLECTIONS.DISHES;
const DAILY_STOCK_COLLECTION_ID = DB.COLLECTIONS.DAILY_STOCK;
const WEEKLY_SCHEDULES_COLLECTION_ID = DB.COLLECTIONS.WEEKLY_SCHEDULES;
const PROJECT_ID = APPWRITE_CONFIG.PROJECT_ID;

const dishesByCategorySlug = new Map();
const categoryTabs = [];
const dishRuntimeIdToDish = new Map();
let currentDishCategory = "";

function escapeHtml(value) {
    if (!value) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(value) {
    if (!value) return "";
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u0111/g, "d")
        .replace(/\u0110/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function toWeekId(value = new Date()) {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getTodayDayId() {
    const jsDayToDayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    return jsDayToDayId[new Date().getDay()] || "mon";
}

function getTodayDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDishImageUrl(imageId) {
    if (!imageId) return "";
    return `https://fra.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${imageId}/view?project=${PROJECT_ID}`;
}

function loadAdminTrackerStock() {
    // Customer page: do not read localStorage (keep only cart storage).
    return [];
}

function isDishAvailable(item) {
    return item.available !== false && Number(item.quantity || 0) > 0;
}

function getDishById(dishId) {
    return dishRuntimeIdToDish.get(Number(dishId)) || null;
}

function mapCategoryToTabLabel(categoryName, fallback) {
    const name = String(categoryName || "").trim();
    if (!name) return fallback || "Danh muc";
    return name;
}

function updateTotalItemsCount() {
    const totalItemsEl = document.getElementById("totalItems");
    if (!totalItemsEl) return;

    let total = 0;
    for (const items of dishesByCategorySlug.values()) total += items.length;
    totalItemsEl.textContent = String(total);
}

function renderTabs() {
    const tabsContainer = document.getElementById("dishesTabs");
    if (!tabsContainer) return;

    if (!categoryTabs.length) {
        tabsContainer.innerHTML = "";
        return;
    }

    tabsContainer.innerHTML = categoryTabs.map((category, index) => {
        const activeClass = index === 0 ? "active" : "";
        return `<button class="tab-btn ${activeClass}" data-category="${escapeHtml(category.slug)}">${escapeHtml(category.label)}</button>`;
    }).join("");
}

function renderDishCard(item) {
    const available = isDishAvailable(item);
    const buttonLabel = available ? "Thêm vào giỏ hàng" : "Tạm hết hàng";
    const quantity = Number(item.quantity || 0);

    // Xác định màu sắc và nhãn hiển thị số lượng
    const qtyColor = quantity <= 5 ? "#ef4444" : "#64748b";
    const qtyWeight = quantity <= 5 ? "700" : "600";
    
    const stockLabel = available 
        ? `<span class="dish-inventory" style="font-size: 0.75rem; color: ${qtyColor}; font-weight: ${qtyWeight}; display: block; margin-top: 2px;">Còn ${quantity} suất</span>` 
        : '<span class="dish-inventory" style="font-size: 0.75rem; color: #ef4444; font-weight: 700; display: block; margin-top: 2px;">Hết món</span>';

    return `
        <div class="dish-card ${available ? "" : "dish-sold-out"}" data-id="${item.id}">
            <div class="dish-image">
                <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.name || "Món ăn")}">
                ${available ? "" : '<div class="dish-sold-out-overlay">HẾT</div>'}
            </div>
            
            <div class="dish-info">
                <h3 class="dish-name">${escapeHtml(item.name || "Món ăn")}</h3>
                <p class="dish-desc">${escapeHtml(item.description || "Đang cập nhật mô tả")}</p>
            </div>

            <div class="dish-action-group">
                <div class="dish-price-block">
                    <span class="discount-price">${Number(item.price || 0).toLocaleString("vi-VN")}đ</span>
                    ${stockLabel}
                </div>
                <button class="btn-add-cart-icon" onclick="addToCartDish(${item.id})" ${available ? "" : "disabled"} title="${buttonLabel}">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-text">THÊM </span>
                </button>
            </div>
        </div>
    `;
}

function displayDishesByCategory(categorySlug) {
    const grid = document.getElementById("dishesGrid"); 
    if (!grid) return;

    const items = dishesByCategorySlug.get(categorySlug) || [];
    if (!items.length) {
        grid.innerHTML = '<p class="no-items">Khong co mon an nao trong danh muc nay</p>';
        return;
    }

    grid.innerHTML = items.map(renderDishCard).join("");
}

function updateActiveTab(categorySlug) {
    document.querySelectorAll(".tab-btn").forEach((tab) => {
        const isActive = tab.getAttribute("data-category") === categorySlug;
        tab.classList.toggle("active", isActive);
    });
}

function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((tab) => {
        tab.addEventListener("click", () => {
            const slug = tab.getAttribute("data-category") || "";
            if (!slug) return;
            
            // Xóa nội dung tìm kiếm khi chuyển danh mục
            const searchInput = document.getElementById("dishSearchInput");
            if (searchInput) searchInput.value = "";
            
            currentDishCategory = slug;
            updateActiveTab(slug);
            displayDishesByCategory(slug);
        });
    });
}

/**
 * Khởi tạo chức năng tìm kiếm món ăn
 */
function setupSearch() {
    const searchInput = document.getElementById("dishSearchInput");
    const headerSearchBtn = document.getElementById("headerSearchIcon");

    if (!searchInput) return;

    // Sự kiện click vào icon tìm kiếm trên Header
    if (headerSearchBtn) {
        headerSearchBtn.addEventListener("click", () => {
            const section = document.getElementById("dishes-menu");
            if (section) {
                // Cuộn mượt mà xuống phần thực đơn
                section.scrollIntoView({ behavior: 'smooth' });
                // Focus vào ô input sau khi cuộn (khoảng 600ms)
                setTimeout(() => searchInput.focus(), 600);
            }
        });
    }

    searchInput.addEventListener("input", (e) => {
        const searchTerm = normalizeText(e.target.value);
        
        if (!searchTerm) {
            // Nếu xóa trắng thì hiển thị lại theo danh mục đang chọn
            displayDishesByCategory(currentDishCategory);
            updateActiveTab(currentDishCategory);
            return;
        }

        // Tìm kiếm trên toàn bộ dữ liệu món ăn đã tải (không phân biệt danh mục)
        const results = [];
        dishRuntimeIdToDish.forEach(dish => {
            const nameMatch = normalizeText(dish.name).includes(searchTerm);
            const descMatch = normalizeText(dish.description).includes(searchTerm);
            if (nameMatch || descMatch) {
                results.push(dish);
            }
        });

        // Bỏ trạng thái active của các tab khi đang tìm kiếm
        document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
        
        const grid = document.getElementById("dishesGrid");
        if (grid) {
            if (results.length === 0) {
                grid.innerHTML = `<p class="no-items" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">Không tìm thấy món ăn nào khớp với "${escapeHtml(e.target.value)}"</p>`;
            } else {
                grid.innerHTML = results.map(renderDishCard).join("");
            }
        }
    });
}

async function fetchAllDocuments(collectionId, queries = []) {
    const docs = [];
    let offset = 0;
    const limit = 100;
    let total = Infinity;

    while (offset < total) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            collectionId,
            [...queries, Query.limit(limit), Query.offset(offset)]
        );

        const chunk = response?.documents || [];
        total = Number(response?.total || 0);
        docs.push(...chunk);
        offset += chunk.length;

        if (!chunk.length) break;
    }

    return docs;
}

function buildStateFromDb(categories, dishes, scheduledDishesForToday = []) {
    dishesByCategorySlug.clear();
    categoryTabs.length = 0;
    dishRuntimeIdToDish.clear();

    // Map để lấy giá override từ lịch trình
    const priceOverrides = new Map();
    scheduledDishesForToday.forEach(item => {
        const price = Number(item.priceOverride || item.basePrice || 0);
        if (price > 0) priceOverrides.set(item.dishId, price);
    });

    const activeCategories = (categories || [])
        .filter((category) => {
            const normalizedSlug = normalizeText(category?.slug || "");
            const normalizedName = normalizeText(category?.name || "");
            const isMainCategory = normalizedSlug === "main" || normalizedName === "monchinh";
            return category?.isActive !== false || isMainCategory;
        })
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

    // Xác định những danh mục có món ăn trong danh sách truyền vào
    const categoryIdsWithDishes = new Set();
    (dishes || []).forEach(dish => {
        if (dish.categoryId) categoryIdsWithDishes.add(String(dish.categoryId));
    });

    const categoryIdToMeta = new Map();
    activeCategories.forEach((category) => {
        const id = String(category.$id);
        const slug = String(category?.slug || id).trim();
        const label = mapCategoryToTabLabel(category?.name, slug);
        const normalizedSlug = normalizeText(slug);
        const normalizedLabel = normalizeText(label);

        const isMainCategory = normalizedSlug === "main" || normalizedLabel === "monchinh";
        if (!categoryIdsWithDishes.has(id) && !isMainCategory) return; // Bỏ qua danh mục không có món (trừ Mon chinh)
        
        categoryTabs.push({ slug, label, id });
        categoryIdToMeta.set(id, { slug, label });
        dishesByCategorySlug.set(slug, []);
    });

    (dishes || []).forEach((dish, index) => {
        const catMeta = categoryIdToMeta.get(String(dish?.categoryId || ""));
        if (!catMeta) return; 
        const targetSlug = catMeta.slug;

        const runtimeId = index + 1;
        const price = priceOverrides.get(dish.$id) || Number(dish?.price || 0);
        const mappedDish = {
            id: runtimeId,
            dishId: String(dish?.$id || ""),
            name: String(dish?.name || "Món ăn"),
            description: String(dish?.description || ""),
            price: price,
            quantity: 1,
            available: dish?.isAvailable !== false,
            image: getDishImageUrl(dish?.imageId),
            categorySlug: targetSlug,
            categoryLabel: catMeta?.label || String(dish?.categorySlug || "Danh mục")
        };

        dishRuntimeIdToDish.set(runtimeId, mappedDish);
        dishesByCategorySlug.get(targetSlug).push(mappedDish);
    });

    for (const [slug, items] of dishesByCategorySlug.entries()) {
        items.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        dishesByCategorySlug.set(slug, items);
    }
}

function updateDishAvailabilityByStock(stocksByDishId, stocksByName) {
    for (const items of dishesByCategorySlug.values()) {
        items.forEach((item) => {
            const byId = item.dishId ? stocksByDishId.get(item.dishId) : null;
            const byName = stocksByName.get(normalizeText(item.name)) || null;
            const stock = byId || byName;

            if (!stock) {
                // Nếu không tìm thấy thông tin tồn kho cho ngày hôm nay, 
                // mặc định coi như hết món để tránh khách đặt nhầm món chưa chuẩn bị.
                item.quantity = 0;
                item.available = false;
                return;
            }

            const remainingQty = Number.isFinite(Number(stock.remainingQty)) ? Number(stock.remainingQty) : 0;
            item.quantity = Math.max(0, Math.round(remainingQty));
            item.available = remainingQty > 0 && stock.isAvailable !== false;
        });
    }
}

async function applyDailyStockFromDb() {
    try {
        const dateKey = getTodayDateKey();
        const docs = await fetchAllDocuments(DAILY_STOCK_COLLECTION_ID, [
            Query.equal("dateKey", dateKey)
        ]);

        const adminDocs = loadAdminTrackerStock(dateKey);
        const effectiveDocs = adminDocs.length ? adminDocs : docs;

        if (!effectiveDocs.length) {
            // Khong co daily_stock cho hom nay -> giu nguyen trang thai mon tu dishes
            return;
        }

        const stocksByDishId = new Map();
        const stocksByName = new Map();

        effectiveDocs.forEach((doc) => {
            const dishId = String(doc?.dishId || "").trim();
            const dishNameKey = normalizeText(doc?.dishName || "");
            const remainingQty = Number.isFinite(Number(doc?.remainingQty))
                ? Number(doc.remainingQty)
                : null;
            const openingQty = Number.isFinite(Number(doc?.openingQty))
                ? Number(doc.openingQty)
                : null;
            const soldAutoQty = Number.isFinite(Number(doc?.soldAutoQty))
                ? Number(doc.soldAutoQty)
                : 0;
            const soldAdjustQty = Number.isFinite(Number(doc?.soldAdjustQty))
                ? Number(doc.soldAdjustQty)
                : 0;
            const computedRemaining = remainingQty !== null
                ? remainingQty
                : (openingQty !== null ? Math.max(0, openingQty - soldAutoQty - soldAdjustQty) : 0);
            const stock = {
                remainingQty: computedRemaining,
                isAvailable: doc?.isAvailable !== false
            };

            if (dishId) stocksByDishId.set(dishId, stock);
            if (dishNameKey) stocksByName.set(dishNameKey, stock);
        });

        updateDishAvailabilityByStock(stocksByDishId, stocksByName);
    } catch (error) {
        console.warn("Khong tai duoc daily stock, bo qua:", error?.message || error);
    }
}

async function loadDishesFromDb() {
    const spinner = document.getElementById("loadingSpinner");
    const grid = document.getElementById("dishesGrid");

    if (!databases) {
        if (grid) grid.innerHTML = '<p class="no-items">Khong ket noi duoc Appwrite</p>';
        return;
    }

    if (spinner) spinner.style.display = "flex";

    try {
        const now = new Date();
        const weekId = toWeekId(now);
        const todayDayId = getTodayDayId();

        const [categories, dishes, scheduleRes] = await Promise.all([
            fetchAllDocuments(CATEGORIES_COLLECTION_ID),
            fetchAllDocuments(DISHES_COLLECTION_ID),
            databases.listDocuments(
                DATABASE_ID, 
                WEEKLY_SCHEDULES_COLLECTION_ID, 
                [Query.equal("weekId", weekId), Query.limit(1)]
            ).catch(() => ({ documents: [] }))
        ]);

        const scheduleDoc = scheduleRes.documents[0] || null;
        let scheduledDishesForToday = [];
        if (scheduleDoc && scheduleDoc.scheduleJson) {
            const schedule = JSON.parse(scheduleDoc.scheduleJson);
            scheduledDishesForToday = (schedule.dishes || []).filter(item => item.dayId === todayDayId);
        }

        const dishesById = new Map((dishes || []).map(d => [String(d?.$id || ""), d]));
        const scheduledDishDocs = [];
        const seen = new Set();

        // Luôn ưu tiên danh sách từ lịch (có thể có món chưa/không load đủ field trong collection dishes).
        (scheduledDishesForToday || [])
            .slice()
            .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
            .forEach((entry) => {
                const scheduledDishId = String(entry?.dishId || "").trim();
                if (!scheduledDishId || seen.has(scheduledDishId)) return;
                seen.add(scheduledDishId);

                const dishDoc = dishesById.get(scheduledDishId);
                if (dishDoc) {
                    scheduledDishDocs.push(dishDoc);
                    return;
                }

                // Fallback: vẫn hiển thị món theo dữ liệu trong lịch (để không bị mất món).
                scheduledDishDocs.push({
                    $id: scheduledDishId,
                    name: entry?.dishName || "Món ăn",
                    description: entry?.description || "",
                    price: Number(entry?.basePrice || 0),
                    categoryId: entry?.categoryId || "",
                    imageId: entry?.dishImageId || entry?.imageId || "",
                    isAvailable: true
                });
            });

        buildStateFromDb(categories, scheduledDishDocs, scheduledDishesForToday);
        await applyDailyStockFromDb();

        renderTabs();
        if (!categoryTabs.length) {
            if (grid) grid.innerHTML = '<p class="no-items">Chua co danh muc mon an</p>';
            return;
        }

        currentDishCategory = categoryTabs[0].slug;
        updateActiveTab(currentDishCategory);
        displayDishesByCategory(currentDishCategory);
        setupTabs();
        setupSearch(); // Kích hoạt tìm kiếm sau khi tải xong dữ liệu
        updateTotalItemsCount();
    } catch (error) {
        console.error("Khong tai duoc mon an tu DB:", error);
        if (grid) grid.innerHTML = '<p class="no-items">Khong tai duoc du lieu mon an</p>';
    } finally {
        if (spinner) spinner.style.display = "none";
    }
}

let dishesRefreshTimer = null;
let isRefreshingDishes = false;

async function refreshDishesFromDb() {
    if (isRefreshingDishes) return;
    isRefreshingDishes = true;
    try {
        await loadDishesFromDb();
    } finally {
        isRefreshingDishes = false;
    }
}

function addToCartDish(dishId) {
    console.log("Adding dish to cart:", dishId);
    
    const dish = getDishById(dishId);
    if (!dish || !isDishAvailable(dish)) return;

    if (typeof window.addToCart === "function") {
        window.addToCart({
            id: Number(dishId),
            dishId: dish.dishId,
            name: dish.name,
            price: dish.price,
            image: dish.image,
            maxStock: dish.quantity // Truyền số lượng tồn kho hiện tại
        });

        // Tự động mở modal giỏ hàng với hiệu ứng trượt từ phải qua
        if (typeof window.openCartModal === "function") {
            window.openCartModal();
        }
    }
}

async function initDishes() {
    await loadDishesFromDb();

    const scheduleRefresh = () => {
        if (dishesRefreshTimer) clearTimeout(dishesRefreshTimer);
        dishesRefreshTimer = setTimeout(() => {
            void refreshDishesFromDb();
        }, 300);
    };

    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") scheduleRefresh();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDishes);
} else {
    initDishes();
}

window.addToCartDish = addToCartDish;
window.refreshDishesFromDb = refreshDishesFromDb;
