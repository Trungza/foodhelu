﻿﻿﻿﻿﻿﻿// MENU.JS - TODAY COMBOS WITH OUT-OF-STOCK REPLACEMENTS (APPWRITE)
import { APPWRITE_CONFIG, DB } from "../../shared/js/config.js";
import { databases, Query, DATABASE_ID, BUCKET_ID } from "../../shared/js/appwrite.js";

const WEEKLY_SCHEDULES_COLLECTION_ID = "weekly_schedules";
const COMBOS_COLLECTION_ID = DB.COLLECTIONS.COMBOS;
const COMBO_ITEMS_COLLECTION_ID = DB.COLLECTIONS.COMBO_ITEMS;
const DISHES_COLLECTION_ID = "dishes";
const DAILY_STOCK_COLLECTION_ID = "daily_stock";
const PROJECT_ID = APPWRITE_CONFIG.PROJECT_ID;

const jsDayToDayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MAX_REPLACEMENTS_PER_ITEM = 4;

const menuState = {
    combos: [],
    comboById: new Map(),
    selectionsByComboId: {},
    currentPage: 0
};

let menuPageTransitionTimer = null;

function getItemsPerPage() {
    if (window.matchMedia("(max-width: 640px)").matches) return 1;
    if (window.matchMedia("(max-width: 980px)").matches) return 2;
    return 3;
}

function getTotalPages(totalItems, itemsPerPage) {
    return Math.ceil(totalItems / itemsPerPage);
}

function renderMenuDots(totalPages, currentPage) {
    const dotsEl = document.getElementById("menuDots");
    if (!dotsEl) return;

    if (totalPages <= 1) {
        dotsEl.innerHTML = "";
        return;
    }

    dotsEl.innerHTML = Array.from({ length: totalPages }, (_, idx) => `
        <button
            type="button"
            class="menu-dot ${idx === currentPage ? "active" : ""}"
            data-page="${idx}"
            aria-label="Trang combo ${idx + 1}"
            aria-current="${idx === currentPage ? "true" : "false"}"
        ></button>
    `).join("");
}



function bindMenuPaginationEvents() {
    const prevBtn = document.getElementById("menuPrevBtn");
    const nextBtn = document.getElementById("menuNextBtn");
    const dotsEl = document.getElementById("menuDots");

    prevBtn?.addEventListener("click", () => {
        if (menuState.currentPage <= 0) return;
        menuState.currentPage -= 1;
        renderCombosWithTransition(menuState.combos, "prev");
    });

    nextBtn?.addEventListener("click", () => {
        const totalPages = getTotalPages(menuState.combos.length, getItemsPerPage());
        if (menuState.currentPage >= totalPages - 1) return;
        menuState.currentPage += 1;
        renderCombosWithTransition(menuState.combos, "next");
    });

    dotsEl?.addEventListener("click", (event) => {
        const dot = event.target.closest(".menu-dot");
        if (!dot) return;
        const page = Number(dot.dataset.page);
        if (!Number.isInteger(page) || page < 0) return;
        if (page === menuState.currentPage) return;
        const direction = page > menuState.currentPage ? "next" : "prev";
        menuState.currentPage = page;
        renderCombosWithTransition(menuState.combos, direction);
    });
}

let lastItemsPerPage = getItemsPerPage();
function handleMenuResize() {
    const nextItemsPerPage = getItemsPerPage();
    if (nextItemsPerPage === lastItemsPerPage) return;
    lastItemsPerPage = nextItemsPerPage;
    menuState.currentPage = 0;
    renderCombos(menuState.combos);
}

function escapeHtml(value) {
    if (!value) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function toFiniteNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function normalizeOverridePrice(value) {
    const numeric = toFiniteNumber(value);
    if (numeric === null || numeric <= 0) return null;
    return numeric;
}

function roundPrice(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function toDateKey(value = new Date()) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toWeekId(value = new Date()) {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getTodayDayId(value = new Date()) {
    return jsDayToDayId[new Date(value).getDay()] || "mon";
}

function toSafeWeekDocId(weekId) {
    const safeWeekPart = String(weekId).replace(/[^a-zA-Z0-9._-]/g, "_");
    return `week_${safeWeekPart}`.slice(0, 36);
}

function getDishImageUrl(imageId) {
    if (!imageId) return "";
    return `https://fra.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${imageId}/view?project=${PROJECT_ID}`;
}

function loadAdminTrackerStock() {
    // Customer page: do not read localStorage (keep only cart storage).
    return [];
}

function parseScheduleJson(rawScheduleJson) {
    if (!rawScheduleJson) return { combos: [] };

    if (typeof rawScheduleJson === "object") {
        return {
            combos: Array.isArray(rawScheduleJson.combos) ? rawScheduleJson.combos : []
        };
    }

    if (typeof rawScheduleJson !== "string") return { combos: [] };

    try {
        const parsed = JSON.parse(rawScheduleJson);
        return {
            combos: Array.isArray(parsed?.combos) ? parsed.combos : []
        };
    } catch (error) {
        console.error("Khong parse duoc scheduleJson:", error);
        return { combos: [] };
    }
}

function isCollectionNotFoundError(error) {
    const statusCode = Number(error?.code || 0);
    const errorType = String(error?.type || "");
    const message = String(error?.message || "").toLowerCase();
    return statusCode === 404
        && (errorType === "collection_not_found" || message.includes("collection with the requested id"));
}

function isDocumentNotFoundError(error) {
    const statusCode = Number(error?.code || 0);
    const errorType = String(error?.type || "");
    const message = String(error?.message || "").toLowerCase();
    return statusCode === 404
        && (errorType === "document_not_found" || message.includes("document with the requested id"));
}

async function fetchAllDocuments(collectionId, queries = []) {
    const limit = 100;
    const docs = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
        const response = await databases.listDocuments(
            DATABASE_ID,
            collectionId,
            [
                ...queries,
                Query.limit(limit),
                Query.offset(offset)
            ]
        );

        const chunk = response?.documents || [];
        total = Number(response?.total || 0);
        docs.push(...chunk);
        offset += chunk.length;
        if (!chunk.length) break;
    }

    return docs;
}

async function fetchWeeklyScheduleDocument(weekId) {
    // Sử dụng listDocuments ngay từ đầu để tránh log lỗi 404 Not Found trong console trình duyệt
    try {
        const docs = await fetchAllDocuments(WEEKLY_SCHEDULES_COLLECTION_ID, [
            Query.equal("weekId", weekId),
            Query.orderDesc("$updatedAt"),
            Query.limit(1)
        ]);
        return docs[0] || null;
    } catch (error) {
        if (isCollectionNotFoundError(error)) return null;
        // Nếu là lỗi 404 (document not found) từ listDocuments thì trả về null thay vì ném lỗi
        if (error.code === 404) return null;
        throw error;
    }
}

async function fetchWeeklyComboDocuments(weekId, dayId) {
    try {
        return await fetchAllDocuments(COMBOS_COLLECTION_ID, [
            Query.equal("weekId", weekId),
            Query.equal("dayId", dayId)
        ]);
    } catch (error) {
        if (isCollectionNotFoundError(error)) return [];
        throw error;
    }
}

async function fetchComboItemsByComboId(comboId) {
    try {
        return await fetchAllDocuments(COMBO_ITEMS_COLLECTION_ID, [
            Query.equal("comboId", comboId)
        ]);
    } catch (error) {
        if (isCollectionNotFoundError(error)) return [];
        throw error;
    }
}

async function fetchLatestWeeklyScheduleDocument() {
    try {
        const docs = await fetchAllDocuments(WEEKLY_SCHEDULES_COLLECTION_ID, [
            Query.orderDesc("publishedAt"),
            Query.limit(1)
        ]);
        return docs[0] || null;
    } catch (error) {
        if (isCollectionNotFoundError(error)) return null;
        throw error;
    }
}

async function fetchDishesIndex() {
    const docs = await fetchAllDocuments(DISHES_COLLECTION_ID, [Query.limit(500)]);
    const byId = new Map();
    const byCategory = new Map();

    docs.forEach((dish) => {
        const id = String(dish?.$id || "").trim();
        if (!id) return;

        byId.set(id, dish);

        const categoryId = String(dish?.categoryId || "").trim();
        if (!categoryId) return;

        const list = byCategory.get(categoryId) || [];
        list.push(dish);
        byCategory.set(categoryId, list);
    });

    return { byId, byCategory };
}

async function fetchTodayStockMap(todayDateKey) {
    try {
        const docs = await fetchAllDocuments(DAILY_STOCK_COLLECTION_ID, [
            Query.equal("dateKey", todayDateKey)
        ]);

        const adminDocs = loadAdminTrackerStock(todayDateKey);
        const effectiveDocs = adminDocs.length ? adminDocs : docs;

        const stockByDishId = new Map();
        effectiveDocs.forEach((doc) => {
            const dishId = String(doc?.dishId || "").trim();
            if (!dishId) return;
            stockByDishId.set(dishId, doc);
        });
        return stockByDishId;
    } catch (error) {
        if (isCollectionNotFoundError(error)) return new Map();
        throw error;
    }
}

function getStockRemaining(stockDoc) {
    if (!stockDoc) return null;
    const remainingQty = Number.isFinite(Number(stockDoc?.remainingQty))
        ? Number(stockDoc.remainingQty)
        : null;
    if (remainingQty !== null) return remainingQty;

    const openingQty = Number.isFinite(Number(stockDoc?.openingQty))
        ? Number(stockDoc.openingQty)
        : null;
    if (openingQty === null) return 0;

    const soldAutoQty = Number.isFinite(Number(stockDoc?.soldAutoQty))
        ? Number(stockDoc.soldAutoQty)
        : 0;
    const soldAdjustQty = Number.isFinite(Number(stockDoc?.soldAdjustQty))
        ? Number(stockDoc.soldAdjustQty)
        : 0;
    return Math.max(0, openingQty - soldAutoQty - soldAdjustQty);
}

function isStockAvailable(stockDoc) {
    if (!stockDoc) return null;
    const remainingQty = getStockRemaining(stockDoc);
    return remainingQty > 0 && stockDoc?.isAvailable !== false;
}

function isDishAvailableWithStock(dishDoc, stockByDishId) {
    if (!dishDoc) return false;

    const dishId = String(dishDoc.$id || dishDoc.id || "");
    const stockDoc = stockByDishId.get(dishId);

    // Bắt buộc phải có dữ liệu tồn kho hôm nay và số lượng còn lại > 0
    if (!stockDoc) return false;

    const remaining = getStockRemaining(stockDoc);
    return remaining > 0 && stockDoc.isAvailable !== false;
}

function buildReplacementCandidates(sourceItem, sourceDishDoc, dishesByCategory, stockByDishId) {
    // Lấy ID danh mục từ dữ liệu gốc của món ăn
    const categoryId = String(sourceDishDoc?.categoryId || sourceItem?.categoryId || "").trim();
    if (!categoryId) return [];

    // Lấy tất cả món ăn trong cùng danh mục
    const candidates = dishesByCategory.get(categoryId) || [];
    
    return candidates
        .filter((dish) => {
            const dishId = String(dish?.$id || dish?.id || "");
            const sourceId = String(sourceItem?.dishId || sourceItem?.id || "");
            // Loại bỏ chính món đang bị hết hàng khỏi danh sách gợi ý
            return dishId !== sourceId;
        })
        .filter((dish) => isDishAvailableWithStock(dish, stockByDishId)) // Chỉ lấy món còn hàng
        .slice(0, MAX_REPLACEMENTS_PER_ITEM)
        .map((dish) => {
            const dishId = String(dish.$id || dish.id);
            const stockDoc = stockByDishId.get(dishId);
            return {
                id: dishId,
                name: dish?.name || "Món thay thế",
                price: roundPrice(toFiniteNumber(dish?.price) || 0),
                available: true,
                image: getDishImageUrl(dish?.imageId || ""),
                maxStock: getStockRemaining(stockDoc)
            };
        });
}

function collectComboImages(items = []) {
    const images = [];
    for (const item of items) {
        const image = String(item?.image || "").trim();
        if (!image) continue;
        if (images.includes(image)) continue;
        images.push(image);
        if (images.length >= 4) break;
    }
    return images;
}

function createComboImageHTML(combo) {
    const images = Array.isArray(combo?.images)
        ? combo.images.filter((src) => Boolean(String(src || "").trim())).slice(0, 4)
        : [];

    if (!images.length) {
        return `
            <div class="menu-item-image combo-image-fallback">
                <span class="combo-image-fallback-text">COMBO</span>
            </div>
        `;
    }

    if (images.length === 1) {
        return `
            <div class="menu-item-image">
                <img src="${escapeHtml(images[0])}" alt="${escapeHtml(combo?.name || "Combo")}" />
            </div>
        `;
    }

    return `
        <div class="menu-item-image menu-item-image-collage combo-image-count-${images.length}">
            ${images.map((src, idx) => `
                <img
                    class="combo-image-tile"
                    src="${escapeHtml(src)}"
                    alt="${escapeHtml((combo?.name || "Combo") + " - mon " + (idx + 1))}"
                />
            `).join("")}
        </div>
    `;
}

function createDishThumbHTML(image, name, extraClass = "") {
    const className = `dish-thumb ${extraClass}`.trim();
    const imageUrl = String(image || "").trim();
    if (!imageUrl) {
        return `<span class="${className} dish-thumb-empty" aria-hidden="true"></span>`;
    }
    return `<span class="${className}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name || "Mon an")}" /></span>`;
}

function createComboItemSummaryRow(item) {
    return `
        <div class="combo-item-row ${item.available ? "" : "out-of-stock"}">
            <div class="combo-item-main">
                <i class="fas fa-circle" style="${item.available ? "" : "color:#ef4444;"}"></i>
                ${createDishThumbHTML(item.image, item.name, "combo-item-thumb")}
                <span>${escapeHtml(item.name)}${item.available ? "" : ' <span class="out-of-stock-tag">(tam het)</span>'}</span>
            </div>
        </div>
    `;
}

function mapApiComboToViewModel(rawCombo, index, dishesById, dishesByCategory, stockByDishId) {
    const items = Array.isArray(rawCombo?.items)
        ? rawCombo.items.map((item) => {
            const dishId = String(item?.dishId || "").trim();
            const sourceDish = dishId ? dishesById.get(dishId) : null;
            const qty = Math.max(1, Math.round(toFiniteNumber(item?.quantity) || 1));
            const basePrice = toFiniteNumber(item?.basePrice);
            const dishPrice = toFiniteNumber(sourceDish?.price);
            const originalPrice = roundPrice(basePrice ?? dishPrice ?? 0);

            const stockDoc = dishId ? stockByDishId.get(dishId) : null;
            const remainingQty = stockDoc ? getStockRemaining(stockDoc) : 0;
            const stockAvailability = stockDoc ? (remainingQty > 0 && stockDoc.isAvailable !== false) : null;

            const available = stockAvailability === null
                ? (sourceDish ? sourceDish?.isAvailable !== false : false)
                : stockAvailability;

            const replacements = available
                ? []
                : buildReplacementCandidates(item, sourceDish, dishesByCategory, stockByDishId);

            return {
                dishId,
                name: item?.dishName || sourceDish?.name || "Mon an",
                quantity: qty,
                originalPrice,
                image: getDishImageUrl(item?.dishImageId || sourceDish?.imageId || ""),
                available,
                maxStock: remainingQty,
                replacements
            };
        })
        : [];

    const priceOverride = normalizeOverridePrice(rawCombo?.priceOverride);
    const comboPrice = toFiniteNumber(rawCombo?.price);
    const totalFromItems = items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);

    const discountPrice = roundPrice(priceOverride ?? comboPrice ?? totalFromItems);
    const originalPrice = roundPrice(Math.max(totalFromItems, discountPrice));
    const images = collectComboImages(items);
    const firstImage = images[0] || "";

    return {
        id: String(rawCombo?.$id || rawCombo?.comboId || `combo_${index + 1}`),
        name: rawCombo?.name || `Combo ${index + 1}`,
        items,
        image: firstImage,
        images,
        originalPrice,
        discountPrice
    };
}

function getSelectedReplacement(item, selections) {
    const replacements = Array.isArray(item?.replacements) ? item.replacements : [];
    const selectedId = selections?.[item.dishId] || null;
    if (!selectedId) return null;
    return replacements.find((replacement) => String(replacement.id) === String(selectedId)) || null;
}

function isComboAvailable(combo, selections = {}) {
    for (const item of combo.items) {
        if (item.available) continue;
        const selected = getSelectedReplacement(item, selections);
        if (selected) continue;
        const hasAnyReplacement = Array.isArray(item.replacements) && item.replacements.length > 0;
        if (!hasAnyReplacement) return false;
    }
    return true;
}

function getCurrentComboPricing(combo, selections = {}) {
    let hasReplacement = false;
    let hasMissingSelection = false;
    let adjustedOriginalPrice = 0;

    for (const item of combo.items) {
        if (item.available) {
            adjustedOriginalPrice += item.originalPrice * item.quantity;
            continue;
        }

        const replacement = getSelectedReplacement(item, selections);
        if (replacement) {
            adjustedOriginalPrice += replacement.price * item.quantity;
            hasReplacement = true;
            continue;
        }

        const hasAnyReplacement = Array.isArray(item.replacements) && item.replacements.length > 0;
        if (hasAnyReplacement) {
            hasMissingSelection = true;
            continue;
        }
        hasMissingSelection = true;
    }

    const finalOriginalPrice = roundPrice(adjustedOriginalPrice);
    const finalDiscountPrice = roundPrice(hasMissingSelection ? combo.discountPrice : finalOriginalPrice);

    if (!hasReplacement && !hasMissingSelection) {
        return {
            originalPrice: combo.originalPrice,
            price: combo.discountPrice,
            hasReplacement: false,
            hasMissingSelection: false
        };
    }

    return {
        originalPrice: finalOriginalPrice,
        price: finalDiscountPrice,
        hasReplacement,
        hasMissingSelection
    };
}

function createComboItemRow(comboId, item) {
    if (item.available) {
        return `
            <div class="combo-item-row">
                <div class="combo-item-main">
                    <i class="fas fa-circle"></i>
                    ${createDishThumbHTML(item.image, item.name, "combo-item-thumb")}
                    <span>${escapeHtml(item.name)}</span>
                </div>
            </div>
        `;
    }

    const replacements = Array.isArray(item.replacements) ? item.replacements : [];
    if (!replacements.length) {
        return createComboItemSummaryRow(item);
    }

    const selections = menuState.selectionsByComboId[comboId] || {};
    const currentSelection = String(selections[item.dishId] || "");
    const selectedReplacement = replacements.find((replacement) => String(replacement.id) === currentSelection) || null;
    const triggerContentHtml = selectedReplacement
        ? `
            ${createDishThumbHTML(selectedReplacement.image || "", selectedReplacement.name || "Mon thay the", "replacement-selected-thumb")}
            <span class="replacement-trigger-label">${escapeHtml(selectedReplacement.name)} (+${selectedReplacement.price.toLocaleString('vi-VN')}đ)</span>
        `
        : `<span class="replacement-trigger-placeholder">Chon mon thay the</span>`;
    const menuOptionsHtml = replacements.map((replacement) => {
        const isSelected = currentSelection === String(replacement.id);
        return `
            <button
                type="button"
                class="replacement-menu-option ${isSelected ? "selected" : ""}"
                data-replacement-id="${escapeHtml(replacement.id)}"
            >
                ${createDishThumbHTML(replacement.image || "", replacement.name || "Mon thay the", "replacement-option-thumb")}
                <span class="replacement-option-name">
                    ${escapeHtml(replacement.name)}
                    <span style="display: block; font-size: 10px; color: #64748b; font-weight: 400; margin-top: 2px;">Còn ${replacement.maxStock} suất</span>
                </span>
                <span class="replacement-option-price">+${replacement.price.toLocaleString('vi-VN')}đ</span>
            </button>
        `;
    }).join("");

    return `
        <div class="combo-item-row out-of-stock">
            <div class="combo-item-main">
                <i class="fas fa-circle" style="color:#ef4444;"></i>
                ${createDishThumbHTML(item.image, item.name, "combo-item-thumb")}
                <span>${escapeHtml(item.name)} <span class="out-of-stock-tag">(tam het)</span></span>
            </div>
            <div class="replacement-options">
                <div
                    class="replacement-picker"
                    data-combo-id="${comboId}"
                    data-item-dish-id="${escapeHtml(item.dishId)}"
                >
                    <button type="button" class="replacement-trigger" aria-haspopup="listbox" aria-expanded="false">
                        <span class="replacement-trigger-main">
                            ${triggerContentHtml}
                        </span>
                        <i class="fas fa-chevron-down replacement-trigger-icon"></i>
                    </button>
                    <div class="replacement-menu" role="listbox">
                        ${menuOptionsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createMenuItemHTML(combo) {
    const selections = menuState.selectionsByComboId[combo.id] || {};
    const available = isComboAvailable(combo, selections);

    if (!available) {
        return `
            <div class="menu-item combo-sold-out" data-combo-id="${combo.id}">
                <div class="combo-card-head">
                    <div class="menu-item-name">${escapeHtml(combo.name)}<span class="combo-warning-badge">TAM HET</span></div>
                </div>
                <div class="combo-items-list">${combo.items.map((item) => createComboItemSummaryRow(item)).join("")}</div>
               
                <div class="menu-item-price-action">
                    <div class="price-group">
                        <span class="original-price">${combo.originalPrice.toLocaleString('vi-VN')}đ</span>
                        <span class="discount-price">${combo.discountPrice.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <button class="add-combo-btn" disabled><i class="fas fa-ban"></i></button>
                </div>
            </div>
        `;
    }

    const itemsHtml = combo.items.map((item) => createComboItemRow(combo.id, item)).join("");
    const pricing = getCurrentComboPricing(combo, selections);
    const showPriceBadge = Math.abs(pricing.price - combo.discountPrice) > 0.01;

    return `
        <div class="menu-item" data-combo-id="${combo.id}">
            <div class="combo-card-head">
                <div class="menu-item-name">
                    ${escapeHtml(combo.name)}
                    ${showPriceBadge ? '<span class="price-adjusted-badge">GIA DA DIEU CHINH</span>' : ""}
                </div>
            </div>
            <div class="combo-items-list">${itemsHtml}</div>
            <div class="menu-item-price-action">
                <div class="price-group">
                    <span class="original-price" id="original_price_${combo.id}">${pricing.originalPrice.toLocaleString('vi-VN')}đ</span>
                    <span class="discount-price" id="price_${combo.id}">${pricing.price.toLocaleString('vi-VN')}đ</span>
                </div>
                <button class="add-combo-btn" onclick="addComboToCart('${escapeHtml(combo.id)}')"><i class="fas fa-plus"></i></button>
            </div>
        </div>
    `;
}

function renderCombos(combos) {
    const grid = document.getElementById("menuGrid");
    if (!grid) return;

    if (!combos.length) {
        grid.innerHTML = '<p class="no-items">Hom nay chua co combo</p>';
        // updateMenuPagination(0);
        return;
    }

    const itemsPerPage = getItemsPerPage();
    const totalPages = getTotalPages(combos.length, itemsPerPage);
    menuState.currentPage = Math.min(Math.max(0, menuState.currentPage), totalPages - 1);

    const startIndex = menuState.currentPage * itemsPerPage;
    const visibleCombos = combos.slice(startIndex, startIndex + itemsPerPage);
    grid.innerHTML = visibleCombos.map(createMenuItemHTML).join("");
    // updateMenuPagination(combos.length);
    attachReplacementEvents();
}

function renderCombosWithTransition(combos, direction = "next") {
    const grid = document.getElementById("menuGrid");
    if (!grid) return;

    if (menuPageTransitionTimer) {
        clearTimeout(menuPageTransitionTimer);
        menuPageTransitionTimer = null;
    }

    grid.classList.remove("dir-next", "dir-prev");
    grid.classList.add("is-switching", direction === "prev" ? "dir-prev" : "dir-next");
    menuPageTransitionTimer = setTimeout(() => {
        renderCombos(combos);
        grid.classList.remove("is-switching", "dir-next", "dir-prev");
        menuPageTransitionTimer = null;
    }, 140);
}

function attachReplacementEvents() {
    document.querySelectorAll(".replacement-trigger").forEach((trigger) => {
        trigger.removeEventListener("click", handleReplacementTriggerClick);
        trigger.addEventListener("click", handleReplacementTriggerClick);
    });

    document.querySelectorAll(".replacement-menu-option").forEach((option) => {
        option.removeEventListener("click", handleReplacementOptionClick);
        option.addEventListener("click", handleReplacementOptionClick);
    });
}

function closeReplacementMenus(exceptPicker = null) {
    document.querySelectorAll(".replacement-picker.open").forEach((picker) => {
        if (exceptPicker && picker === exceptPicker) return;
        picker.classList.remove("open");
        const trigger = picker.querySelector(".replacement-trigger");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
}

function handleReplacementTriggerClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const picker = event.currentTarget.closest(".replacement-picker");
    if (!picker) return;

    const willOpen = !picker.classList.contains("open");
    closeReplacementMenus(picker);
    picker.classList.toggle("open", willOpen);
    event.currentTarget.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function applyReplacementSelection(comboId, itemDishId, selectedDishId) {
    if (!comboId || !itemDishId) return;

    const comboKey = String(comboId);

    if (!menuState.selectionsByComboId[comboKey]) menuState.selectionsByComboId[comboKey] = {};
    if (selectedDishId) {
        menuState.selectionsByComboId[comboKey][itemDishId] = selectedDishId;
    } else {
        delete menuState.selectionsByComboId[comboKey][itemDishId];
    }

    const combo = menuState.comboById.get(comboKey);
    if (!combo) return;

    const pricing = getCurrentComboPricing(combo, menuState.selectionsByComboId[comboKey]);
    const originalPriceEl = document.getElementById(`original_price_${comboId}`);
    const priceEl = document.getElementById(`price_${comboId}`);
    if (originalPriceEl) originalPriceEl.textContent = `${pricing.originalPrice.toLocaleString('vi-VN')}đ`;
    if (priceEl) priceEl.textContent = `${pricing.price.toLocaleString('vi-VN')}đ`;

    renderCombos(menuState.combos);
}

function handleReplacementOptionClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const option = event.currentTarget;
    const picker = option.closest(".replacement-picker");
    if (!picker) return;

    const comboId = String(picker.dataset.comboId || "");
    const itemDishId = String(picker.dataset.itemDishId || "");
    const selectedDishId = String(option.dataset.replacementId || "");

    closeReplacementMenus();
    applyReplacementSelection(comboId, itemDishId, selectedDishId);
}

async function loadCombosFromApi() {
    const grid = document.getElementById("menuGrid");
    if (!grid) return;

    if (!databases) {
        grid.innerHTML = '<p class="no-items">Khong ket noi duoc Appwrite</p>';
        return;
    }

    grid.innerHTML = '<p class="no-items">Dang tai combo...</p>';

    let todayCombos = [];
    try {
        const now = new Date();
        const weekId = toWeekId(now);
        const todayDayId = getTodayDayId(now);
        const todayDateKey = toDateKey(now);

        const [scheduleDoc, dishesIndex, stockByDishId] = await Promise.all([
            fetchWeeklyScheduleDocument(weekId),
            fetchDishesIndex(),
            fetchTodayStockMap(todayDateKey)
        ]);

        // Ưu tiên đọc từ JSON của tuần hiện tại
        let parsed = parseScheduleJson(scheduleDoc?.scheduleJson);
        let combosRaw = Array.isArray(parsed?.combos) ? parsed.combos : [];

        // Nếu không có lịch tuần này, thử lấy lịch mới nhất đã publish (fallback)
        if (!combosRaw.length && !scheduleDoc) {
            const latestScheduleDoc = await fetchLatestWeeklyScheduleDocument();
            parsed = parseScheduleJson(latestScheduleDoc?.scheduleJson);
            combosRaw = Array.isArray(parsed?.combos) ? parsed.combos : [];
        }

        if (combosRaw.length) {
            todayCombos = combosRaw
                .filter((combo) => {
                    if (combo?.isActive === false) return false;
                    const comboDayId = String(combo?.dayId || "").trim().toLowerCase();
                    return comboDayId === todayDayId;
                })
                .map((combo, index) => mapApiComboToViewModel(combo, index, dishesIndex.byId, dishesIndex.byCategory, stockByDishId));
        }

        menuState.combos = todayCombos;
        menuState.comboById.clear();
        menuState.selectionsByComboId = {};

        todayCombos.forEach((combo) => {
            menuState.comboById.set(combo.id, combo);
            menuState.selectionsByComboId[combo.id] = {};
        });

        renderCombos(todayCombos);
    } catch (error) {
        console.error("Khong tai duoc combo tu API:", error);
        grid.innerHTML = '<p class="no-items">Khong tai duoc combo tu API</p>';
    }
}

function addComboToCart(comboId) {
    const combo = menuState.comboById.get(String(comboId));
    if (!combo || typeof window.addToCart !== "function") return;

    const selections = menuState.selectionsByComboId[combo.id] || {};
    const pricing = getCurrentComboPricing(combo, selections);

    if (!isComboAvailable(combo, selections)) return;

    let note = "";
    combo.items.forEach((item) => {
        if (item.available) return;
        const replacement = getSelectedReplacement(item, selections);
        if (replacement) note += `${item.name} -> ${replacement.name} | `;
    });

    const itemsForCart = combo.items.map((item) => {
        const replacement = getSelectedReplacement(item, selections);
        const activeItem = replacement || item;
        return {
            dishId: activeItem.id || activeItem.dishId,
            name: activeItem.name,
            qtyPerCombo: item.quantity,
            maxStock: activeItem.maxStock
        };
    });

    window.addToCart({
        id: combo.id,
        name: combo.name + (note ? " (da thay doi)" : ""),
        price: pricing.price,
        image: combo.image,
        isCombo: true,
        note: note ? note.slice(0, -3) : combo.items.map((item) => `${item.name} x${item.quantity}`).join(" \n "),
        comboItems: itemsForCart
    });
}

function initMenu() {
    bindMenuPaginationEvents();
    window.addEventListener("resize", handleMenuResize);
    document.addEventListener("click", () => closeReplacementMenus());
    void loadCombosFromApi();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
} else {
    initMenu();
}

window.addComboToCart = addComboToCart;
