import { databases, storage, Query, DATABASE_ID, BUCKET_ID, ID } from "../../../shared/js/appwrite.js";
import { APPWRITE_CONFIG, DB } from "../../../shared/js/config.js";
import { STATUS } from "../../../shared/js/utils.js";

const { COLLECTIONS } = DB;

function normalizeText(value) {
    if (!value) return "";
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "")
        .toLowerCase();
}

function buildCategoryNameResolver(categories = []) {
    const byId = new Map();
    const bySlug = new Map();
    const byName = new Map();

    categories.forEach((category) => {
        const id = String(category?.$id || "");
        const name = String(category?.name || "");
        const slug = normalizeText(category?.slug || "");
        const normalizedName = normalizeText(name);

        if (id) byId.set(id, name);
        if (slug) bySlug.set(slug, name);
        if (normalizedName) byName.set(normalizedName, name);
    });

    return (categoryId, categoryName) => {
        const rawName = String(categoryName || "").trim();
        if (rawName && normalizeText(rawName) !== "danhmuc") return rawName;
        const normalizedKey = normalizeText(categoryId || "");
        return byId.get(String(categoryId || ""))
            || bySlug.get(normalizedKey)
            || byName.get(normalizedKey)
            || "Danh muc";
    };
}

export async function fetchCategories(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CATEGORIES, [
        Query.orderAsc("order"),
        Query.limit(limit),
        Query.offset(offset)
    ]);
    return { documents: response.documents, total: response.total };
}

export async function fetchDishes(page = 1, limit = 10, categoryId = "") {
    const offset = (page - 1) * limit;
    const queries = [
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
        Query.offset(offset)
    ];

    if (categoryId) {
        queries.push(Query.equal("categoryId", categoryId));
    }

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DISHES, queries);
    return { documents: response.documents, total: response.total };
}

export async function fetchAllCategories(limit = 1000) {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CATEGORIES, [
        Query.limit(limit)
    ]);
    return response.documents || [];
}

export function getDishImageUrl(imageId, projectId) {
    if (!imageId) return "";
    return `${APPWRITE_CONFIG.ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${imageId}/view?project=${projectId}`;
}

export async function getCategoryById(categoryId) {
    return databases.getDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, categoryId);
}

export async function createCategory(data) {
    return databases.createDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, ID.unique(), data);
}

export async function updateCategory(categoryId, data) {
    return databases.updateDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, categoryId, data);
}

export async function deleteCategory(categoryId) {
    try {
        // Lấy tất cả món ăn thuộc danh mục này
        const dishes = await getDishesByCategory(categoryId);
        // Duyệt qua từng món để xóa ảnh trong Storage
        for (const dish of dishes) {
            if (dish.imageId) {
                try {
                    await storage.deleteFile(BUCKET_ID, dish.imageId);
                } catch (e) {
                    console.warn(`Không thể xóa ảnh ${dish.imageId} của món ${dish.$id} khi xóa danh mục:`, e);
                }
            }
        }
    } catch (error) {
        console.error("Lỗi dọn dẹp tài nguyên khi xóa danh mục:", error);
    }
    return databases.deleteDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, categoryId);
}

export async function getDishById(dishId) {
    return databases.getDocument(DATABASE_ID, COLLECTIONS.DISHES, dishId);
}

export async function createDish(data) {
    return databases.createDocument(DATABASE_ID, COLLECTIONS.DISHES, ID.unique(), data);
}

export async function updateDish(dishId, data) {
    try {
        // Lấy thông tin món ăn hiện tại để kiểm tra ảnh cũ
        const oldDish = await getDishById(dishId);
        // Nếu trong dữ liệu cập nhật có imageId mới và nó khác với imageId đang có
        if (data.imageId && oldDish && oldDish.imageId && data.imageId !== oldDish.imageId) {
            await storage.deleteFile(BUCKET_ID, oldDish.imageId);
        }
    } catch (error) {
        // Log cảnh báo nếu không xóa được ảnh cũ, nhưng vẫn tiếp tục cập nhật thông tin món ăn
        console.warn("Không thể xóa ảnh cũ khi cập nhật món ăn:", error);
    }
    return databases.updateDocument(DATABASE_ID, COLLECTIONS.DISHES, dishId, data);
}

export async function deleteDish(dishId) {
    try {
        // Lấy thông tin món ăn hiện tại để tìm imageId trước khi xóa document
        const dish = await getDishById(dishId);
        if (dish && dish.imageId) {
            // Xóa file ảnh tương ứng khỏi Appwrite Storage
            await storage.deleteFile(BUCKET_ID, dish.imageId);
        }
    } catch (error) {
        // Nếu không tìm thấy món hoặc ảnh đã bị xóa trước đó, vẫn tiếp tục để xóa document
        console.warn("Không thể xóa ảnh món ăn trên Storage:", error);
    }
    return databases.deleteDocument(DATABASE_ID, COLLECTIONS.DISHES, dishId);
}

export async function getDishesByCategory(categoryId, limit = 1000) {
    // Trả về mảng rỗng ngay lập tức nếu categoryId không hợp lệ để tránh lỗi Query.equal
    if (!categoryId) return [];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DISHES, [
        Query.equal("categoryId", categoryId),
        Query.orderAsc("name"),
        Query.limit(limit)
    ]);
    return response.documents || [];
}

export async function uploadDishImage(file) {
    return storage.createFile(BUCKET_ID, ID.unique(), file);
}

function toIsoDateTime(value = new Date()) {
    return new Date(value).toISOString();
}

function toWeekId(value = new Date()) {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
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

async function listAllDocuments(collectionId, queries = []) {
    const limit = 100;
    let offset = 0;
    let total = Infinity;
    const documents = [];

    while (offset < total) {
        const response = await databases.listDocuments(DATABASE_ID, collectionId, [
            ...queries,
            Query.limit(limit),
            Query.offset(offset)
        ]);

        total = response.total || 0;
        documents.push(...(response.documents || []));
        offset += response.documents.length;

        if (!response.documents.length) break;
    }

    return documents;
}

/**
 * Hàm helper dọn dẹp các file ảnh không còn được sử dụng trong Database
 * @returns {Promise<{totalChecked: number, deleted: number}>}
 */
export async function cleanupOrphanedImages() {
    try {
        // 1. Lấy tất cả File ID từ Appwrite Storage (hỗ trợ phân trang)
        let allFiles = [];
        let offset = 0;
        const limit = 100;
        let totalFiles = Infinity;

        while (offset < totalFiles) {
            const response = await storage.listFiles(BUCKET_ID, [Query.limit(limit), Query.offset(offset)]);
            totalFiles = response.total;
            allFiles.push(...response.files);
            offset += response.files.length;
            if (response.files.length === 0) break;
        }

        const storageFileIds = allFiles.map(f => f.$id);

        // 2. Lấy tất cả file đang được tham chiếu trong collection DISHES và GALLERY_MEDIA
        const dishes = await listAllDocuments(COLLECTIONS.DISHES, [Query.select(["imageId"])]);
        const galleryMedia = COLLECTIONS.GALLERY_MEDIA
            ? await listAllDocuments(COLLECTIONS.GALLERY_MEDIA, [Query.select(["fileId"])]).catch(() => [])
            : [];
        const usedImageIds = new Set([
            ...dishes.map(d => d.imageId).filter(Boolean),
            ...galleryMedia.map(item => item.fileId).filter(Boolean),
        ]);

        // 3. Xác định các file không còn sử dụng
        const orphanedIds = storageFileIds.filter(id => !usedImageIds.has(id));

        // 4. Thực hiện xóa
        let deletedCount = 0;
        for (const fileId of orphanedIds) {
            await storage.deleteFile(BUCKET_ID, fileId);
            deletedCount++;
        }

        return { totalChecked: storageFileIds.length, deleted: deletedCount };
    } catch (error) {
        console.error("Lỗi khi thực hiện cleanup Storage:", error);
        throw error;
    }
}

async function deleteDocumentsByQuery(collectionId, queries = []) {
    const docs = await listAllDocuments(collectionId, queries);
    for (const doc of docs) {
        await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
    }
}

async function createDailyMenuDocuments(weekId, items, nowIso) {
    for (const item of items) {
        const basePrice = toFiniteNumber(item.basePrice);
        const overridePrice = normalizeOverridePrice(item.priceOverride);
        const sortOrder = toFiniteNumber(item.sortOrder);
        const payload = {
            weekId,
            dayId: item.dayId,
            categoryId: item.categoryId,
            categoryName: item.categoryName || "Danh muc",
            dishId: item.dishId,
            dishName: item.dishName || "Mon an",
            basePrice: basePrice !== null ? Math.round(basePrice) : 0,
            isActive: item.isActive !== false
        };
        if (item.dishImageId) payload.dishImageId = item.dishImageId;
        if (overridePrice !== null) payload.priceOverride = Math.round(overridePrice);
        if (sortOrder !== null) payload.sortOrder = Math.round(sortOrder);

        await databases.createDocument(DATABASE_ID, COLLECTIONS.DAILY_MENU, ID.unique(), payload);
    }
}

async function createComboDocuments(weekId, combos, nowIso) {
    for (const combo of combos) {
        const comboPrice = toFiniteNumber(combo.price);
        const comboOverridePrice = normalizeOverridePrice(combo.priceOverride);
        const comboPayload = {
            weekId,
            dayId: combo.dayId,
            categoryId: combo.categoryId,
            categoryName: combo.categoryName || "Danh muc",
            name: combo.name || "Combo",
            price: comboPrice !== null ? Math.round(comboPrice) : 0,
            isActive: combo.isActive !== false,
            createdAt: nowIso,
            updatedAt: nowIso
        };
        if (comboOverridePrice !== null) comboPayload.priceOverride = Math.round(comboOverridePrice);

        const comboDoc = await databases.createDocument(DATABASE_ID, COLLECTIONS.COMBOS, ID.unique(), comboPayload);
        const comboItems = Array.isArray(combo.items) ? combo.items : [];

        for (const item of comboItems) {
            const quantity = toFiniteNumber(item.quantity);
            const itemBasePrice = toFiniteNumber(item.basePrice);
            const itemPayload = {
                weekId,
                comboId: comboDoc.$id,
                dishId: item.dishId,
                dishName: item.dishName || item.name || "Mon an",
                quantity: quantity !== null ? Math.max(1, Math.round(quantity)) : 1,
                createdAt: nowIso,
                updatedAt: nowIso
            };
            if (item.dishImageId || item.imageId) itemPayload.dishImageId = item.dishImageId || item.imageId;
            if (itemBasePrice !== null) itemPayload.basePrice = Math.round(itemBasePrice);

            await databases.createDocument(DATABASE_ID, COLLECTIONS.COMBO_ITEMS, ID.unique(), itemPayload);
        }
    }
}

async function replaceComboDocuments(weekId, combos, nowIso) {
    const oldCombos = await listAllDocuments(COLLECTIONS.COMBOS, [
        Query.equal("weekId", weekId)
    ]);

    for (const comboDoc of oldCombos) {
        const oldItems = await listAllDocuments(COLLECTIONS.COMBO_ITEMS, [
            Query.equal("comboId", comboDoc.$id)
        ]);

        for (const item of oldItems) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.COMBO_ITEMS, item.$id);
        }

        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.COMBOS, comboDoc.$id);
    }

    await createComboDocuments(weekId, combos, nowIso);
}

export async function publishWeeklyMealSchedule({ weekId, dishes = [], combos = [] }) {
    const normalizedWeekId = weekId || toWeekId(new Date());
    const nowIso = toIsoDateTime();
    const safeWeekPart = String(normalizedWeekId).replace(/[^a-zA-Z0-9._-]/g, "_");
    const documentId = `week_${safeWeekPart}`.slice(0, 36);

    const categories = await fetchAllCategories(1000).catch(() => []);
    const resolveCategoryName = buildCategoryNameResolver(categories);
    const normalizedDishes = (dishes || []).map((entry) => ({
        ...entry,
        categoryName: resolveCategoryName(entry?.categoryId, entry?.categoryName),
        // Đảm bảo ID ổn định cho Frontend
        id: entry.id || entry.dishId || entry.$id
    }));
    const normalizedCombos = (combos || []).map((entry) => ({
        ...entry,
        categoryName: resolveCategoryName(entry?.categoryId, entry?.categoryName),
        // Đảm bảo ID ổn định cho Frontend
        id: entry.id || entry.comboId || entry.$id,
        // Giữ nguyên mảng items bên trong
        items: Array.isArray(entry.items) ? entry.items : []
    }));
    const payload = {
        weekId: normalizedWeekId,
        scheduleJson: JSON.stringify({ dishes: normalizedDishes, combos: normalizedCombos }),
        dishesCount: normalizedDishes.length,
        combosCount: normalizedCombos.length,
        publishedAt: nowIso,
        updatedAt: nowIso,
    };

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.WEEKLY_SCHEDULES, documentId, payload);
    } catch (error) {
        const isCollectionNotFound = isCollectionNotFoundError(error);
        if (isCollectionNotFound) {
            throw new Error("Chua co collection `weekly_schedules` de luu lich nhanh");
        }

        const isDocNotFound = isDocumentNotFoundError(error);
        if (!isDocNotFound) throw error;

        await databases.createDocument(DATABASE_ID, COLLECTIONS.WEEKLY_SCHEDULES, documentId, {
            ...payload,
            createdAt: nowIso
        });
    }

    return {
        weekId: normalizedWeekId,
        dishes: dishes.length,
        combos: combos.length
    };
}

function isDocumentNotFoundError(error) {
    const statusCode = Number(error?.code || 0);
    const errorType = String(error?.type || "");
    const message = String(error?.message || "").toLowerCase();
    return statusCode === 404 && (errorType === "document_not_found" || message.includes("document with the requested id"));
}

function isCollectionNotFoundError(error) {
    const statusCode = Number(error?.code || 0);
    const errorType = String(error?.type || "");
    const message = String(error?.message || "").toLowerCase();
    return statusCode === 404 && (errorType === "collection_not_found" || message.includes("collection with the requested id"));
}

function parseWeeklyScheduleJson(rawScheduleJson) {
    if (!rawScheduleJson) return { dishes: [], combos: [] };

    if (typeof rawScheduleJson === "object") {
        const dishes = Array.isArray(rawScheduleJson.dishes) ? rawScheduleJson.dishes : [];
        const combos = Array.isArray(rawScheduleJson.combos) ? rawScheduleJson.combos : [];
        return { dishes, combos };
    }

    if (typeof rawScheduleJson !== "string") return { dishes: [], combos: [] };

    try {
        const parsed = JSON.parse(rawScheduleJson);
        const dishes = Array.isArray(parsed?.dishes) ? parsed.dishes : [];
        const combos = Array.isArray(parsed?.combos) ? parsed.combos : [];
        return { dishes, combos };
    } catch (error) {
        console.error("Khong parse duoc scheduleJson:", error);
        return { dishes: [], combos: [] };
    }
}

function normalizeWeeklyScheduleDocument(document, fallbackWeekId) {
    const { dishes, combos } = parseWeeklyScheduleJson(document?.scheduleJson);
    
    // Chuẩn hóa Dish: Ép cả id và $id để tương thích với mọi logic filter ở UI
    const normalizedDishes = dishes.map((d, idx) => ({
        ...d,
        id: d.id || d.dishId || d.$id || `dish_${idx}`,
        $id: d.$id || d.id || d.dishId || `dish_${idx}`
    }));

    // Chuẩn hóa Combo: Đảm bảo không mất mảng items và ID không bị undefined
    const normalizedCombos = combos.map((c, idx) => ({
        ...c,
        id: c.id || c.comboId || c.$id || `combo_${idx}`,
        $id: c.$id || c.id || c.comboId || `combo_${idx}`,
        items: Array.isArray(c.items) ? c.items.map((item, i) => ({
            ...item,
            id: item.id || item.dishId || `item_${idx}_${i}`
        })) : []
    }));

    return {
        weekId: document?.weekId || fallbackWeekId || "",
        dishes: normalizedDishes,
        combos: normalizedCombos,
        updatedAt: document?.updatedAt || document?.publishedAt || document?.$updatedAt || null
    };
}

export function getCurrentWeekId(value = new Date()) {
    return toWeekId(value);
}

function toStartOfDateIso(value = new Date()) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
}

function toEndOfDateIso(value = new Date()) {
    const date = new Date(value);
    date.setHours(24, 0, 0, 0);
    return date.toISOString();
}

function parseOrderItems(rawItems) {
    if (Array.isArray(rawItems)) return rawItems;
    if (typeof rawItems !== "string") return [];
    try {
        const parsed = JSON.parse(rawItems);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Khong parse duoc items cua don hang:", error);
        return [];
    }
}

function normalizeOrderDocument(document) {
    const rawItems = parseOrderItems(document?.items);
    const items = rawItems
        .map((item) => {
            const quantity = Number.isFinite(Number(item?.quantity))
                ? Math.max(1, Math.round(Number(item.quantity)))
                : 1;
            return {
                dishId: item?.dishId || item?.id || "",
                dishName: item?.dishName || item?.name || "",
                quantity
            };
        })
        .filter((item) => item.dishId || item.dishName);

    return {
        id: document?.orderId || document?.$id || "",
        status: document?.status || "",
        createdAt: document?.createdAt || document?.$createdAt || "",
        items
    };
}

function toDateKey(value = new Date()) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toDayId(value = new Date()) {
    const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    return dayMap[new Date(value).getDay()] || "mon";
}

function toStockDocumentId(dateKey, dishId) {
    const safeDate = String(dateKey || "").replace(/[^0-9]/g, "").slice(0, 8);
    const safeDish = String(dishId || "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-20);
    return `stock_${safeDate}_${safeDish}`.slice(0, 36);
}

function normalizeStockDocument(document) {
    return {
        id: document?.$id || "",
        dateKey: document?.dateKey || "",
        dayId: document?.dayId || "",
        dishId: document?.dishId || "",
        dishName: document?.dishName || "Mon an",
        categoryId: document?.categoryId || "",
        categoryName: document?.categoryName || "Danh muc",
        dishImageId: document?.dishImageId || "",
        openingQty: Number.isFinite(Number(document?.openingQty)) ? Number(document.openingQty) : 0,
        soldAutoQty: Number.isFinite(Number(document?.soldAutoQty)) ? Number(document.soldAutoQty) : 0,
        soldAdjustQty: Number.isFinite(Number(document?.soldAdjustQty)) ? Number(document.soldAdjustQty) : 0,
        remainingQty: Number.isFinite(Number(document?.remainingQty)) ? Number(document.remainingQty) : 0,
        isAvailable: document?.isAvailable !== false,
        updatedAt: document?.updatedAt || document?.$updatedAt || null
    };
}

export async function fetchWeeklyMealSchedule(weekId) {
    const normalizedWeekId = weekId || toWeekId(new Date());
    const safeWeekPart = String(normalizedWeekId).replace(/[^a-zA-Z0-9._-]/g, "_");
    const documentId = `week_${safeWeekPart}`.slice(0, 36);

    try {
        const document = await databases.getDocument(DATABASE_ID, COLLECTIONS.WEEKLY_SCHEDULES, documentId);
        const schedule = normalizeWeeklyScheduleDocument(document, normalizedWeekId);
        
        return schedule;
    } catch (error) {
        const canFallbackToQuery = isDocumentNotFoundError(error) || isCollectionNotFoundError(error);
        if (!canFallbackToQuery) throw error;
        if (isCollectionNotFoundError(error)) return null;
    }

    let response;
    try {
        response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.WEEKLY_SCHEDULES, [
            Query.equal("weekId", normalizedWeekId),
            Query.orderDesc("$updatedAt"),
            Query.limit(1)
        ]);
    } catch (error) {
        if (isCollectionNotFoundError(error)) return null;
        throw error;
    }
    const fallbackDocument = response.documents?.[0];
    if (!fallbackDocument) return null;

    const schedule = normalizeWeeklyScheduleDocument(fallbackDocument, normalizedWeekId);
    return schedule;
}

export async function fetchOrdersByDate(value = new Date()) {
    const startIso = toStartOfDateIso(value);
    const endIso = toEndOfDateIso(value);

    let documents = [];
    try {
        documents = await listAllDocuments(COLLECTIONS.ORDERS, [
            Query.greaterThanEqual("$createdAt", startIso),
            Query.lessThan("$createdAt", endIso),
            Query.orderDesc("$createdAt")
        ]);
    } catch (error) {
        if (isCollectionNotFoundError(error)) return [];
        throw error;
    }

    return documents.map((document) => normalizeOrderDocument(document));
}

export async function fetchOrderStats() {
    let documents = [];
    try {
        documents = await listAllDocuments(COLLECTIONS.ORDERS, [
            Query.orderDesc("$createdAt")
        ]);
    } catch (error) {
        if (isCollectionNotFoundError(error)) {
            return {
                totalRevenue: 0,
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0
            };
        }
        throw error;
    }

    const stats = {
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0
    };

    documents.forEach((document) => {
        const status = String(document?.status || "");
        stats.totalOrders += 1;

        if (status === STATUS.STEP_1) {
            stats.pendingOrders += 1;
        }

        if (status === STATUS.STEP_4) {
            stats.completedOrders += 1;
            stats.totalRevenue += Number(document?.totalAmount || 0);
        }
    });

    stats.totalRevenue = Math.round(stats.totalRevenue);
    return stats;
}

export async function fetchDailyDishStockByDate(value = new Date()) {
    const dateKey = typeof value === "string" ? value : toDateKey(value);
    let documents = [];

    try {
        documents = await listAllDocuments(COLLECTIONS.DAILY_STOCK, [
            Query.equal("dateKey", dateKey)
        ]);
    } catch (error) {
        if (isCollectionNotFoundError(error)) return [];
        throw error;
    }

    return documents.map((document) => normalizeStockDocument(document));
}

export async function upsertDailyDishStock(entry = {}) {
    const dateKey = entry?.dateKey || toDateKey(new Date());
    const dayId = entry?.dayId || toDayId(new Date());
    const dishId = String(entry?.dishId || "").trim();
    if (!dishId) {
        throw new Error("Thieu dishId khi upsert daily stock");
    }

    const documentId = toStockDocumentId(dateKey, dishId);
    const nowIso = toIsoDateTime();
    const payload = {
        dateKey,
        dayId,
        dishId,
        dishName: entry?.dishName || "Mon an",
        openingQty: Number.isFinite(Number(entry?.openingQty)) ? Math.max(0, Math.round(Number(entry.openingQty))) : 0,
        soldAutoQty: Number.isFinite(Number(entry?.soldAutoQty)) ? Math.max(0, Math.round(Number(entry.soldAutoQty))) : 0,
        soldAdjustQty: Number.isFinite(Number(entry?.soldAdjustQty)) ? Math.round(Number(entry.soldAdjustQty)) : 0,
        remainingQty: Number.isFinite(Number(entry?.remainingQty)) ? Math.max(0, Math.round(Number(entry.remainingQty))) : 0,
        isAvailable: entry?.isAvailable !== false,
        updatedAt: nowIso
    };

    if (entry?.categoryId) payload.categoryId = String(entry.categoryId);
    if (entry?.categoryName) payload.categoryName = String(entry.categoryName);
    if (entry?.dishImageId) payload.dishImageId = String(entry.dishImageId);

    try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.DAILY_STOCK, documentId, payload);
    } catch (error) {
        if (!isDocumentNotFoundError(error)) {
            if (isCollectionNotFoundError(error)) {
                throw new Error("Chua co collection `daily_stock` de luu ton mon");
            }
            throw error;
        }

        await databases.createDocument(DATABASE_ID, COLLECTIONS.DAILY_STOCK, documentId, {
            ...payload,
            createdAt: nowIso
        });
    }

    return {
        id: documentId,
        ...payload
    };
}
