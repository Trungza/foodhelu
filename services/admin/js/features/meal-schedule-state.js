import {
    MEAL_SCHEDULE_DRAFT_KEY,
    toFiniteNumber,
    normalizeOverridePrice,
    COMBO_CATEGORY_ID,
    COMBO_CATEGORY_NAME,
    getDishBasePrice,
    getDishOverridePrice
} from "./meal-schedule-utils.js";

export function flattenSelectedDishes(selectedByDayCategory) {
    const flattened = [];
    selectedByDayCategory.forEach((dishes, key) => {
        const [dayId, categoryId] = key.split("::");
        dishes.forEach((dish, index) => {
            flattened.push({
                dayId, categoryId, categoryName: dish.categoryName || "Danh mục",
                dishId: dish.$id, dishName: dish.name, dishImageId: dish.imageId || "",
                basePrice: getDishBasePrice(dish) || 0,
                priceOverride: getDishOverridePrice(dish),
                sortOrder: index, isActive: true
            });
        });
    });
    return flattened;
}

export function flattenSelectedCombos(combosByDayCategory) {
    const flattened = [];
    combosByDayCategory.forEach((combos, key) => {
        const [dayId, categoryId] = key.split("::");
        combos.forEach((combo) => {
            flattened.push({
                dayId, categoryId, categoryName: combo.categoryName || COMBO_CATEGORY_NAME,
                name: combo.name, price: toFiniteNumber(combo.price) || 0,
                priceOverride: normalizeOverridePrice(combo.overridePrice),
                isActive: true,
                items: (combo.items || []).map(i => ({
                    dishId: i.dishId, dishName: i.name, quantity: i.qty || 1, basePrice: i.basePrice || 0,
                    imageId: i.imageId || null
                }))
            });
        });
    });
    return flattened;
}

export function saveDraftToStorage(selectedByDayCategory, combosByDayCategory) {
    const dishes = []; const combos = [];
    selectedByDayCategory.forEach((items, key) => dishes.push({ key, items }));
    combosByDayCategory.forEach((items, key) => combos.push({ key, items }));
    const payload = { version: 1, savedAt: new Date().toISOString(), dishes, combos };
    localStorage.setItem(MEAL_SCHEDULE_DRAFT_KEY, JSON.stringify(payload));
    return payload;
}

export function loadDraftFromStorage() {
    const raw = localStorage.getItem(MEAL_SCHEDULE_DRAFT_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function applyPublishedScheduleToMaps(schedule, selectedByDayCategory, combosByDayCategory) {
    const dishes = schedule?.dishes || [];
    const combos = schedule?.combos || [];
    if (!dishes.length && !combos.length) return false;

    selectedByDayCategory.clear(); combosByDayCategory.clear();

    dishes.forEach(entry => {
        const key = `${entry.dayId}::${entry.categoryId}`;
        const current = selectedByDayCategory.get(key) || [];
        current.push({
            $id: entry.dishId, name: entry.dishName, imageId: entry.dishImageId,
            basePrice: entry.basePrice, overridePrice: entry.priceOverride
        });
        selectedByDayCategory.set(key, current);
    });

    combos.forEach(entry => {
        const key = `${entry.dayId}::${entry.categoryId}`;
        const current = combosByDayCategory.get(key) || [];
        current.push({
            $id: entry.$id || `combo_${Date.now()}`,
            name: entry.name,
            price: entry.price,
            overridePrice: entry.priceOverride,
            categoryName: entry.categoryName || COMBO_CATEGORY_NAME,
            items: (entry.items || []).map(i => ({ dishId: i.dishId, name: i.dishName, qty: i.quantity, basePrice: i.basePrice, imageId: i.imageId || null }))
        });
        combosByDayCategory.set(key, current);
    });
    return true;
}

export function normalizeDishForSelection(dish, oldDish, categoryName) {
    const basePrice = getDishBasePrice(dish);
    const existingPrice = toFiniteNumber(oldDish?.price);
    const oldOverride = getDishOverridePrice(oldDish);

    const nextPrice = (existingPrice > 0) ? existingPrice : (oldOverride ?? basePrice);
    const overridePrice = normalizeOverridePrice(nextPrice === basePrice ? null : nextPrice);

    return {
        $id: dish.$id,
        name: dish.name,
        imageId: dish.imageId,
        categoryName: categoryName,
        basePrice: basePrice,
        overridePrice: overridePrice,
        price: overridePrice !== null ? overridePrice : basePrice,
    };
}