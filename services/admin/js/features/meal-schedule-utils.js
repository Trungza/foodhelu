export const APPWRITE_PROJECT_ID = "69eb91050034ff637921";
export const COMBO_CATEGORY_ID = "__combo__";
export const COMBO_CATEGORY_NAME = "Combo";
export const MEAL_SCHEDULE_DRAFT_KEY = "meal_schedule_weekly_draft_v1";

export function escapeHtml(value) {
    if (!value) return "";
    return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

export function toFiniteNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeOverridePrice(value) {
    const numeric = toFiniteNumber(value);
    if (numeric === null || numeric <= 0) return null;
    return numeric;
}

export function formatPrice(value) {
    return Number.isFinite(value) ? `${value.toLocaleString("vi-VN")}d` : "";
}

export function getDishBasePrice(dish) {
    const basePrice = toFiniteNumber(dish?.basePrice);
    return basePrice !== null ? basePrice : toFiniteNumber(dish?.price);
}

export function getDishOverridePrice(dish) {
    return normalizeOverridePrice(dish?.overridePrice);
}

export function getDishEffectivePrice(dish) {
    const overridePrice = getDishOverridePrice(dish);
    return overridePrice !== null ? overridePrice : getDishBasePrice(dish);
}

export function createComboId() {
    return `combo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isDocumentNotFoundError(error) {
    const statusCode = Number(error?.code || 0);
    const errorType = String(error?.type || "");
    const message = String(error?.message || "").toLowerCase();
    return statusCode === 404 && (errorType === "document_not_found" || message.includes("document with the requested id"));
}

export function isCollectionNotFoundError(error) {
    const statusCode = Number(error?.code || 0);
    const errorType = String(error?.type || "");
    const message = String(error?.message || "").toLowerCase();
    return statusCode === 404 && (errorType === "collection_not_found" || message.includes("collection with the requested id"));
}

export function calculateComboTotalPrice(items) {
    if (!items || !items.length) return 0;
    return items.reduce((total, item) => total + (item.basePrice || 0) * (item.qty || 1), 0);
}