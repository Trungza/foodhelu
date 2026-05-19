import { getDishImageUrl } from "../data/menu-service.js";
import {
    APPWRITE_PROJECT_ID,
    COMBO_CATEGORY_NAME,
    escapeHtml,
    formatPrice,
    getDishBasePrice,
    getDishOverridePrice,
    getDishEffectivePrice,
    toFiniteNumber,
    createComboId,
    calculateComboTotalPrice
} from "./meal-schedule-utils.js";

export function injectMealScheduleStyles() {
    if (document.querySelector("#meal-schedule-modal-grid-styles")) return;
    const style = document.createElement("style");
    style.id = "meal-schedule-modal-grid-styles";
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .toast-notification { animation: slideIn 0.3s ease; }
        .meal-dish-picker-list, .meal-combo-picker-list {
            display: grid !important; grid-template-columns: 1fr 1fr 1fr 1fr !important;  height: fit-content; gap: 10px !important; padding: 5px !important; list-style: none;
        }
        .meal-dish-option, .meal-combo-option {
            display: flex !important; align-items: center; padding: 12px !important; border: 1px solid #e2e8f0 !important;
            border-radius: 16px; cursor: pointer; transition: all 0.2s ease; position: relative; width: 100%; box-sizing: border-box; text-align: left;
        }
        .meal-dish-option.active, .meal-combo-option.is-selected {
    background: rgba(59,130,246,0.2) !important;
    border: 2px solid #3b82f6 !important;
    border-radius: 16px 12px 12px 16px !important;
    padding-left: 12px !important;
    box-shadow: 0 2px 8px rgba(59,130,246,0.2);
}
        .meal-dish-option-thumb-wrap, .meal-combo-option-thumb-wrap {
            width: 48px; height: 48px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
        }
        .meal-dish-option-thumb, .meal-combo-option-thumb { width: 100%; height: 100%; object-fit: cover; }
        .meal-dish-option-meta { margin-left: 12px; flex-grow: 1; min-width: 0; }
        .meal-dish-option-name { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .meal-dish-option-price-tag { font-size: 13px; font-weight: 700; color: #10b981;display:block }
        .meal-dish-option-indicator { color: #3b82f6; display: none; margin-left: auto; }
        .meal-dish-option.active .meal-dish-option-indicator { display: block; }

        .meal-combo-option-checkmark { color: #10b981; display: none; margin-left: auto; }
        .meal-combo-option.is-selected .meal-combo-option-checkmark { display: block; }
        .meal-combo-option.not-allowed {
        background:rgba(226, 232, 240,0.3);
        cursor:not-allowed;
        }

        .visually-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: -1px;
            padding: 0;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            border: 0;
        }

        .meal-modal-search { position: relative; margin-bottom: 12px; display: flex; align-items: center; }
        .meal-search-input { width: 100%; padding: 8px 12px 8px 36px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; }
        
        .modal-content-menu {
            max-width: 1100px !important;
            width: 95% !important;
            height: 90vh !important;
            display: flex !important;
            flex-direction: column !important;
        }
        .menu-modal-body {
            flex: 1 !important;
            overflow-y: auto !important;
            padding-right: 8px !important;
        }
        .admin-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            color: #f8fafc;
            background:transparent;
        }
        .combo-total-price {
            font-size: 18px;
            font-weight: bold;
            color: #3b82f6;
            margin: 10px 0;
            text-align: right;
        }
       /* Grid 3 cột cho các card combo (giữ nguyên) */
       .meal-add-combo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}
.meal-combo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 12px;
}
.meal-combo-card {
    background: var(--card, rgba(255,255,255,0.06));
    backdrop-filter: blur(10px);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 16px;
    padding: 12px;
    transition: all 0.2s;
}
.meal-combo-card:hover {
    background: rgba(255,255,255,0.1);
    border-color: var(--primary, #3b82f6);
}
.meal-combo-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}
.meal-combo-head strong {
    font-size: 14px;
    font-weight: 600;
    color: var(--text, #e5e7eb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70%;
}
.meal-combo-remove-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: var(--muted, #94a3b8);
}
.meal-combo-remove-btn:hover {
    color: #ef4444;
}
.meal-combo-items-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin: 10px 0;
}
.meal-combo-item {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0,0,0,0.3);
    padding: 6px;
    border-radius: 10px;
}
.meal-combo-item-thumb {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(255,255,255,0.1);
    flex-shrink: 0;
}
.meal-combo-item-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.meal-combo-item-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text, #e5e7eb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.meal-combo-price-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border, rgba(255,255,255,0.08));
    font-size: 13px;
    font-weight: 500;
    color: var(--text, #e5e7eb);
}
.meal-combo-price-input {
    width: 100px;
    padding: 4px 8px;
    background: rgba(0,0,0,0.4);
    border: 1px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 6px;
    font-size: 12px;
    color: var(--text, #e5e7eb);
    text-align: right;
}
    .meal-category-nav-item.active {
    color: #3b82f6;
}
.meal-category-nav-item.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background: #3b82f6;
}
    
    `;
    document.head.appendChild(style);
}

let listIdPicked = []

export function renderPickedDishes(panel, pickedDishes, selectionKey = "") {
    const container = panel.querySelector(".meal-picked-dishes");

    if (!container) return;
    container.dataset.selectionKey = selectionKey;
    if (!pickedDishes?.length) { container.innerHTML = ""; return; }

    container.innerHTML = `
        <ul class="meal-picked-list">
            ${pickedDishes.map((dish) => {

        const imageUrl = dish.imageId ? getDishImageUrl(dish.imageId, APPWRITE_PROJECT_ID) : "";
        const effectivePrice = getDishEffectivePrice(dish);
        return `
                    <li class="meal-picked-card">
                        <div class="meal-picked-thumb-wrap">
                            ${imageUrl ? `<img src="${imageUrl}" class="meal-picked-thumb" />` : `<span class="meal-picked-no-thumb">N/A</span>`}
                        </div>
                        <div class="meal-picked-meta">
                            <strong>${escapeHtml(dish.name)}</strong>
                            <div class="meal-picked-price-row">
                                <input type="number" class="meal-picked-price-input" data-dish-id="${escapeHtml(dish.$id)}" value="${effectivePrice || ""}" />
                            </div>
                        </div>
                        <button type="button" class="meal-dish-remove-btn" data-dish-id="${escapeHtml(dish.$id)}" title="Xoa mon" aria-label="Xoa mon">&times;</button>
                    </li>`;
    }).join("")}
        </ul>`;
}

export function renderPickedCombos(panel, combos, selectionKey = "") {
    const container = panel.querySelector(".meal-picked-combos");
    if (!container) return;
    container.dataset.selectionKey = selectionKey;
    if (!combos?.length) { container.innerHTML = ""; return; }

    container.innerHTML = `
        <div class="meal-picked-title">Combo đã tạo</div>
        <div class="meal-combo-grid">
            ${combos.map((combo) => `
                <div class="meal-combo-card" data-combo-id="${escapeHtml(combo.$id)}">
                    <div class="meal-combo-head">
                        <strong>${escapeHtml(combo.name)}</strong>
                        <button type="button" class="meal-combo-remove-btn" data-combo-id="${escapeHtml(combo.$id)}">&times;</button>
                    </div>
                    <div class="meal-combo-items-grid">
                        ${(combo.items || []).map(item => `
                            <div class="meal-combo-item">
                                <div class="meal-combo-item-thumb">
                                    ${item.imageId ? `<img src="${getDishImageUrl(item.imageId, APPWRITE_PROJECT_ID)}" />` : '<span>🍽️</span>'}
                                </div>
                                <div class="meal-combo-item-name">${escapeHtml(item.name)}</div>
                            </div>
                        `).join("")}
                    </div>
                    <div class="meal-combo-price-row">
                        <span>Tổng:</span>
                        <input type="number" class="meal-combo-price-input" data-combo-id="${escapeHtml(combo.$id)}" value="${combo.overridePrice ?? combo.price}" />
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}
// Modal chọn món của categories
export function showDishPickerModal({ title, dishes, initialSelectedIds = [] }) {
    return new Promise((resolve) => {
        const modal = document.createElement("div");
        modal.className = "modal active";
        const selectedIds = new Set(initialSelectedIds.filter(Boolean));

        const renderItems = (filter = "") => {
            const filtered = dishes.filter(d => !filter || (d.name || "").toLowerCase().includes(filter.toLowerCase()));
            return filtered.map(dish => `
                <button type="button" class="meal-dish-option ${selectedIds.has(dish.$id) ? "active" : ""}" data-id="${escapeHtml(dish.$id)}" data-name="${escapeHtml(dish.name)}" data-image-id="${escapeHtml(dish.imageId)}" data-base-price="${dish.basePrice ?? ""}">
                    <div class="meal-dish-option-thumb-wrap">
                        ${dish.imageId ? `<img src="${getDishImageUrl(dish.imageId, APPWRITE_PROJECT_ID)}" class="meal-dish-option-thumb" />` : `<span>N/A</span>`}
                    </div>
                    <div class="meal-dish-option-meta">
                        <strong class="meal-dish-option-name">${escapeHtml(dish.name)}</strong>
                        <span class="meal-dish-option-price-tag">${formatPrice(dish.basePrice)}</span>
                    </div>
                    <i class="fas fa-check meal-dish-option-indicator"></i>
                </button>`).join("");
        };

        modal.innerHTML = `
            <div class="modal-content modal-content-menu">
                <div class="modal-head"><h3>${escapeHtml(title)}</h3><button type="button" class="modal-close" data-action="cancel">&times;</button></div>
                <div class="menu-modal-body">
                    <div class="meal-modal-search"><input type="text" id="mealDishSearch" class="meal-search-input" placeholder="Tìm món..." /></div>
                    <div class="meal-dish-picker-list" id="mealDishPickerList">${renderItems()}</div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" data-action="cancel">Đóng</button>
                    <button class="btn-primary" data-action="confirm">Xác nhận</button>
                </div>
            </div>`;

        modal.querySelector("#mealDishSearch").addEventListener("input", (e) => {
            modal.querySelector("#mealDishPickerList").innerHTML = renderItems(e.target.value.trim());
        });

        modal.addEventListener("click", (e) => {
            const option = e.target.closest(".meal-dish-option");

            if (option) {
                const id = option.dataset.id;
                selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
                option.classList.toggle("active");
                return;
            }
            if (e.target.closest("[data-action='confirm']")) {
                const result = [];
                modal.querySelectorAll(".meal-dish-option.active").forEach(opt => {
                    result.push({ $id: opt.dataset.id, name: opt.dataset.name, imageId: opt.dataset.imageId, basePrice: toFiniteNumber(opt.dataset.basePrice) });
                });
                modal.remove(); resolve(result);
            } else if (e.target.closest("[data-action='cancel']") || e.target === modal) {
                modal.remove(); resolve(null);
            }
        });
        document.body.appendChild(modal);
    });
}

export function showCreateComboModal({ title, categories, dishesByCategory, selectedByDayCategory, day }) {

    return new Promise((resolve) => {
        let listIdDishForDay = []
        selectedByDayCategory.forEach((value, key) => {
            const getDay = key.split("::")?.[0]
            if (day == getDay) {
                listIdDishForDay = [...listIdDishForDay, ...value]
            }
        })
        listIdPicked = listIdDishForDay.map(i => i.$id)
        const modal = document.createElement("div");
        modal.className = "modal active";

        // Lưu các ID món đã chọn (Set để tránh trùng)
        const selectedDishIds = new Set();
        // Lưu toàn bộ thông tin món đã chọn (để tạo items khi confirm)
        const selectedDishesDetails = new Map(); // key: dishId, value: { name, basePrice, imageId }

        // Hàm tính tổng giá
        const updateTotalPrice = () => {
            let total = 0;
            for (const dish of selectedDishesDetails.values()) {
                total += dish.basePrice;
            }
            const totalEl = modal.querySelector(".combo-total-price");
            if (totalEl) totalEl.textContent = `Tổng: ${formatPrice(total)}`;
            const priceInput = modal.querySelector("#mealComboPrice");
            if (priceInput && !priceInput._userModified) {
                priceInput.value = total;
            }
        };

        // Render danh sách món cho một category
        const renderCategoryDishes = (categoryId) => {
            const dishes = dishesByCategory.get(categoryId) || [];
            const container = modal.querySelector(".meal-combo-picker-list");
            if (!container) return;

            container.innerHTML = dishes.map(dish => {
                const isSelected = selectedDishIds.has(dish.$id);
                const isAllowed = listIdPicked.includes(dish.$id)
                return `
                    <label class="meal-combo-option ${isSelected ? "is-selected" : ""} ${isAllowed ? "" : "not-allowed"}" 
                           data-id="${isAllowed ? dish.$id : ""}" 
                           data-name="${escapeHtml(dish.name)}" 
                           data-base-price="${dish.basePrice ?? 0}" 
                           data-image-id="${dish.imageId || ''}">
                        <input type="checkbox" class="meal-combo-select-input visually-hidden" ${isSelected ? "checked" : ""} />
                        <div class="meal-combo-option-thumb-wrap">
                            ${dish.imageId ? `<img src="${getDishImageUrl(dish.imageId, APPWRITE_PROJECT_ID)}" class="meal-combo-option-thumb" />` : '<span>N/A</span>'}
                        </div>
                        <div class="meal-combo-option-meta">
                            <strong class="meal-dish-option-name">${escapeHtml(dish.name)}</strong>
                            <span class="meal-dish-option-price-tag">${formatPrice(dish.basePrice)}</span>
                        </div>
                        <i class="fas fa-check meal-combo-option-checkmark"></i>
                    </label>`;
            }).join("");

            // Gắn sự kiện click cho từng option (chọn/bỏ chọn món)
            container.querySelectorAll(".meal-combo-option").forEach(opt => {
                opt.removeEventListener("click", optionClickHandler);
                opt.addEventListener("click", optionClickHandler);
            });
        };

        // Xử lý click chọn/bỏ chọn món
        const optionClickHandler = (e) => {
            e.preventDefault();

            const label = e.currentTarget;
            const id = label.dataset.id;
            const name = label.dataset.name;
            const basePrice = toFiniteNumber(label.dataset.basePrice);
            const imageId = label.dataset.imageId;
            if (id === "" || id == null || id == undefined) return
            if (selectedDishIds.has(id)) {
                // Bỏ chọn
                selectedDishIds.delete(id);
                selectedDishesDetails.delete(id);
                label.classList.remove("is-selected");
                const cb = label.querySelector("input");
                if (cb) cb.checked = false;
            } else {
                // Chọn
                selectedDishIds.add(id);
                selectedDishesDetails.set(id, { name, basePrice, imageId });
                label.classList.add("is-selected");
                const cb = label.querySelector("input");
                if (cb) cb.checked = true;
            }
            updateTotalPrice();
        };

        // Chuyển tab category
        const switchCategory = (categoryId) => {
            // Cập nhật active class cho các tab
            modal.querySelectorAll(".meal-category-nav-item").forEach(btn => {
                btn.classList.toggle("active", btn.dataset.id === categoryId);
            });
            // Render danh sách món cho category mới
            renderCategoryDishes(categoryId);
        };

        // Tạo cấu trúc modal
        modal.innerHTML = `
            <div class="modal-content modal-content-menu">
                <div class="modal-head">
                    <h3>${escapeHtml(title)}</h3>
                    <button type="button" class="modal-close" data-action="cancel">&times;</button>
                </div>
                <div class="menu-modal-body">
                    <input id="mealComboName" type="text" class="admin-input" placeholder="Tên combo" style="margin-bottom:10px" />
                    <div class="meal-combo-category-tabs" style="display: flex; gap: 20px; border-bottom: 2px solid rgba(255,255,255,0.2); margin-bottom: 20px;">
                        ${categories.map((c, i) => `<button class="meal-category-nav-item ${i === 0 ? 'active' : ''}" data-id="${c.id}" style="background: none; border: none; padding: 8px 0; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.6); cursor: pointer; position: relative; transition: 0.3s;text-align:center">${c.label}</button>`).join("")}
                    </div>
                    <div class="meal-combo-picker-list"></div>
                </div>
                <div class="modal-actions">
                    <div style="display:flex; align-items:center">
                    <input id="mealComboPrice" type="number" class="admin-input" placeholder="Giá combo (tự tính)" />
</div>
<div style="flex:1"></div>
                    <button class="btn-secondary" data-action="cancel">Đóng</button>
                    <button class="btn-primary" data-action="confirm">Tạo combo</button>
                </div>
            </div>`;

        // Gắn sự kiện click cho các tab (chuyển category)
        const tabBtns = modal.querySelectorAll(".meal-category-nav-item");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const categoryId = btn.dataset.id;
                switchCategory(categoryId);
            });
        });

        // Xử lý giá combo nhập tay
        const priceInput = modal.querySelector("#mealComboPrice");
        priceInput.addEventListener("input", () => {
            priceInput._userModified = true;
        });

        // Render category đầu tiên (mặc định)
        if (categories.length) {
            renderCategoryDishes(categories[0].id);
        }

        // Sự kiện đóng modal và xác nhận
        modal.addEventListener("click", (e) => {
            if (e.target.closest("[data-action='confirm']")) {
                // Tạo items từ selectedDishesDetails
                const items = [];
                for (const [dishId, detail] of selectedDishesDetails.entries()) {
                    items.push({
                        dishId: dishId,
                        name: detail.name,
                        qty: 1,
                        basePrice: detail.basePrice,
                        imageId: detail.imageId || null
                    });
                }
                const comboName = modal.querySelector("#mealComboName").value.trim() || "Combo mới";
                let comboPrice = toFiniteNumber(priceInput.value);
                if (!comboPrice || comboPrice <= 0) {
                    comboPrice = Array.from(selectedDishesDetails.values()).reduce((sum, d) => sum + d.basePrice, 0);
                }
                const result = {
                    $id: createComboId(),
                    name: comboName,
                    price: comboPrice,
                    items: items,
                    categoryName: COMBO_CATEGORY_NAME
                };
                modal.remove();
                resolve(result);
            } else if (e.target.closest("[data-action='cancel']") || e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });

        document.body.appendChild(modal);
        updateTotalPrice();
    });
}
