import { fetchAllCategories, fetchWeeklyMealSchedule, getDishesByCategory, publishWeeklyMealSchedule } from "../data/menu-service.js";
import {
    COMBO_CATEGORY_ID, COMBO_CATEGORY_NAME, getDishBasePrice, getDishOverridePrice,
    toFiniteNumber, normalizeOverridePrice
} from "./meal-schedule-utils.js";
import {
    injectMealScheduleStyles, renderPickedDishes, renderPickedCombos,
    showDishPickerModal, showCreateComboModal
} from "./meal-schedule-ui.js";
import {
    flattenSelectedDishes, flattenSelectedCombos, saveDraftToStorage, loadDraftFromStorage,
    applyPublishedScheduleToMaps, normalizeDishForSelection
} from "./meal-schedule-state.js";

const PANEL_LOADER_HTML = `
    <div class="panel-loader-overlay">
        <div class="loader-wrapper-small">
            <div class="loader-spinner-small"></div>
            <img src="../customer/img/logo.png" class="loader-logo-small" alt="Logo" onerror="this.style.display='none'">
        </div>
    </div>
`;

// ========== CACHE DỮ LIỆU (chỉ fetch 1 lần) ==========
let cachedCategories = null;              // array categories (đã lọc bỏ COMBO)
let cachedDishesByCategory = new Map();   // Map: categoryId -> array dishes (có basePrice)
let setDay = null

export function resetMealScheduleCache() {
    cachedCategories = null;
    cachedDishesByCategory = new Map();
}

async function initCache() {
    if (cachedCategories !== null && cachedDishesByCategory.size > 0) return;
    const allCats = await fetchAllCategories();
    const filtered = allCats.filter(c => c.$id !== COMBO_CATEGORY_ID);
    cachedCategories = filtered;
    for (const cat of filtered) {
        const dishes = await getDishesByCategory(cat.$id);
        const dishesWithBasePrice = dishes.map(d => ({ ...d, basePrice: getDishBasePrice(d) }));
        cachedDishesByCategory.set(cat.$id, dishesWithBasePrice);
    }
}

export function initMealScheduleTabs(root) {
    const tabButtons = Array.from(root.querySelectorAll(".meal-week-tab-btn"));
    const tabPanels = Array.from(root.querySelectorAll(".meal-week-panel"));
    if (!tabButtons.length) return;

    injectMealScheduleStyles();
    const selectedByDayCategory = new Map();
    const combosByDayCategory = new Map();

    const activateDay = (dayId) => {
        tabButtons.forEach(b => b.classList.toggle("active", b.dataset.day === dayId));
        tabPanels.forEach(p => p.classList.toggle("active", p.dataset.dayPanel === dayId));
    };

    const applyCategorySelection = (panel, categoryButton) => {
        panel.querySelectorAll(".meal-category-nav-item").forEach(item => item.classList.toggle("active", item === categoryButton));
        const categoryId = categoryButton.dataset.categoryId || "";
        const dayId = panel.dataset.dayPanel || "";
        const categoryName = categoryButton.innerText.trim();
        const isCombo = categoryId === COMBO_CATEGORY_ID;

        const addDishBtn = panel.querySelector(".meal-add-dish-btn");
        if (addDishBtn) {
            addDishBtn.hidden = isCombo;
            if (isCombo) addDishBtn.style.display = "none";
            else addDishBtn.style.display = "";
            if (!isCombo) {
                addDishBtn.dataset.categoryId = categoryId;
                addDishBtn.dataset.categoryName = categoryName;
                addDishBtn.dataset.day = dayId;
            } else {
                delete addDishBtn.dataset.categoryId;
                delete addDishBtn.dataset.categoryName;
            }
        }

        const addComboBtn = panel.querySelector(".meal-add-combo-btn");
        if (addComboBtn) {
            addComboBtn.hidden = !isCombo;
            addComboBtn.dataset.day = dayId;
        }

        const key = `${dayId}::${categoryId}`;
        if (isCombo) {

            console.log(selectedByDayCategory);
            renderPickedDishes(panel, [], "");
            renderPickedCombos(panel, combosByDayCategory.get(key) || [], key);
        } else {
            renderPickedCombos(panel, [], "");
            renderPickedDishes(panel, selectedByDayCategory.get(key) || [], key);
        }
    };

    if (root._mealScheduleClickHandler) {
        root.removeEventListener("click", root._mealScheduleClickHandler);
    }
    const clickHandler = async (e) => {
        const tabBtn = e.target.closest(".meal-week-tab-btn");



        if (tabBtn) { setDay = tabBtn?.dataset.day; return activateDay(setDay); }

        const catBtn = e.target.closest(".meal-category-nav-item");
        if (catBtn) return applyCategorySelection(catBtn.closest(".meal-week-panel"), catBtn);

        const addDish = e.target.closest(".meal-add-dish-btn");
        if (addDish && !addDish.hidden) {
            const { day, categoryId, categoryName } = addDish.dataset;
            if (!categoryId || categoryId === COMBO_CATEGORY_ID) return;

            // Dùng cache thay vì gọi API
            const dishes = cachedDishesByCategory.get(categoryId) || [];
            const key = `${day}::${categoryId}`;
            const selected = await showDishPickerModal({
                title: `Chọn ${categoryName}`,
                dishes: dishes,
                initialSelectedIds: (selectedByDayCategory.get(key) || []).map(d => d.$id)
            });
            if (selected) {
                const prev = selectedByDayCategory.get(key) || [];
                const next = selected.map(d => normalizeDishForSelection(d, prev.find(p => p.$id === d.$id), categoryName));
                selectedByDayCategory.set(key, next);
                renderPickedDishes(addDish.closest(".meal-week-panel"), next, key);
            }
        }

        const addCombo = e.target.closest(".meal-add-combo-btn");
        if (addCombo && !addCombo.hidden) {
            const { day } = addCombo.dataset;
            // Tận dụng cache categories và dishesByCategory
            const combo = await showCreateComboModal({
                title: "Tạo Combo",
                categories: cachedCategories.map(c => ({ id: c.$id, label: c.name })),
                dishesByCategory: cachedDishesByCategory,
                selectedByDayCategory,
                day: setDay
            });
            if (combo) {
                const key = `${day}::${COMBO_CATEGORY_ID}`;
                const next = [...(combosByDayCategory.get(key) || []), combo];
                combosByDayCategory.set(key, next);
                renderPickedCombos(addCombo.closest(".meal-week-panel"), next, key);
            }
        }

        // Xóa combo
        const removeCombo = e.target.closest(".meal-combo-remove-btn");
        if (removeCombo) {
            const comboId = removeCombo.dataset.comboId;
            const panel = removeCombo.closest(".meal-week-panel");
            const dayId = panel.dataset.dayPanel;
            const activeCategory = panel.querySelector(".meal-category-nav-item.active");
            if (activeCategory && activeCategory.dataset.categoryId === COMBO_CATEGORY_ID) {
                const key = `${dayId}::${COMBO_CATEGORY_ID}`;
                const current = combosByDayCategory.get(key) || [];
                const filtered = current.filter(c => c.$id !== comboId);
                combosByDayCategory.set(key, filtered);
                renderPickedCombos(panel, filtered, key);
            }
        }

        // Xoa mon da chon
        const removeDish = e.target.closest(".meal-dish-remove-btn");
        if (removeDish) {
            const dishId = removeDish.dataset.dishId;
            const panel = removeDish.closest(".meal-week-panel");
            const dayId = panel?.dataset?.dayPanel;
            const activeCategory = panel?.querySelector(".meal-category-nav-item.active");
            const categoryId = activeCategory?.dataset?.categoryId || "";

            if (!dishId || !dayId || !categoryId || categoryId === COMBO_CATEGORY_ID) return;

            const key = `${dayId}::${categoryId}`;
            const current = selectedByDayCategory.get(key) || [];
            const filtered = current.filter((d) => d.$id !== dishId);
            selectedByDayCategory.set(key, filtered);
            renderPickedDishes(panel, filtered, key);
            return;
        }
    };
    root.addEventListener("click", clickHandler);
    root._mealScheduleClickHandler = clickHandler;

    root.querySelector(".meal-schedule-publish-btn")?.addEventListener("click", async (e) => {
        const btn = e.target;
        const schedulePanel = root.closest('.tab-panel');
        try {
            btn.disabled = true;
            if (schedulePanel) schedulePanel.insertAdjacentHTML('afterbegin', PANEL_LOADER_HTML);

            const result = await publishWeeklyMealSchedule({
                dishes: flattenSelectedDishes(selectedByDayCategory),
                combos: flattenSelectedCombos(combosByDayCategory)
            });
            showToast(`Đã đăng lịch tuần ${result.weekId}`);
            saveDraftToStorage(selectedByDayCategory, combosByDayCategory);
            window.dispatchEvent(new CustomEvent("weekly-schedule:published"));
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btn.disabled = false;
            const loader = schedulePanel?.querySelector('.panel-loader-overlay');
            if (loader) loader.remove();
        }
    });

    (async () => {
        // Quan trọng: Khởi tạo cache ngay khi vào tab (chỉ 1 lần)
        await initCache();

        const published = await fetchWeeklyMealSchedule();
        const hasPublished = applyPublishedScheduleToMaps(published, selectedByDayCategory, combosByDayCategory);

        if (!hasPublished) {
            const draft = loadDraftFromStorage();
            if (draft) {
                draft.dishes.forEach(d => selectedByDayCategory.set(d.key, d.items));
                draft.combos.forEach(c => combosByDayCategory.set(c.key, c.items));
            }
        }

        // Khởi tạo panel với category active đầu tiên
        tabPanels.forEach(p => {
            const activeBtn = p.querySelector(".meal-category-nav-item.active") || p.querySelector(".meal-category-nav-item");
            if (activeBtn) applyCategorySelection(p, activeBtn);
        });
    })();
}
