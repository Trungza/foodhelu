//const sdk = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "69eb95be00398251344a";
const DAILY_MENU_COLLECTION_ID = "daily_menu";
const COMBOS_COLLECTION_ID = "combos";
const COMBO_ITEMS_COLLECTION_ID = "combo_items";

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

function parseRequestBody(req) {
    const raw = req?.bodyRaw || req?.body || "";
    if (!raw) return {};
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
}

async function listAllDocuments(databases, collectionId, queries = []) {
    const limit = 100;
    let offset = 0;
    let total = Infinity;
    const documents = [];

    while (offset < total) {
        const response = await databases.listDocuments(DATABASE_ID, collectionId, [
            ...queries,
            sdk.Query.limit(limit),
            sdk.Query.offset(offset)
        ]);

        total = response.total || 0;
        documents.push(...(response.documents || []));
        offset += (response.documents || []).length;
        if (!response.documents?.length) break;
    }

    return documents;
}

async function deleteDocumentsByQuery(databases, collectionId, queries = []) {
    const docs = await listAllDocuments(databases, collectionId, queries);
    for (const doc of docs) {
        await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
    }
}

async function createDailyMenuDocuments(databases, weekId, items, nowIso) {
    for (const item of items) {
        const payload = {
            weekId,
            dayId: item.dayId,
            categoryId: item.categoryId,
            categoryName: item.categoryName || "Danh muc",
            dishId: item.dishId,
            dishName: item.dishName || "Mon an",
            basePrice: Math.round(toFiniteNumber(item.basePrice) || 0),
            isActive: item.isActive !== false,
            createdAt: nowIso,
            updatedAt: nowIso
        };

        if (item.dishImageId) payload.dishImageId = item.dishImageId;
        const dishOverridePrice = normalizeOverridePrice(item.priceOverride);
        if (dishOverridePrice !== null) payload.priceOverride = Math.round(dishOverridePrice);
        if (toFiniteNumber(item.sortOrder) !== null) payload.sortOrder = Math.round(Number(item.sortOrder));

        await databases.createDocument(DATABASE_ID, DAILY_MENU_COLLECTION_ID, "unique()", payload);
    }
}

async function createComboDocuments(databases, weekId, combos, nowIso) {
    for (const combo of combos) {
        const comboPayload = {
            weekId,
            dayId: combo.dayId,
            categoryId: combo.categoryId,
            categoryName: combo.categoryName || "Danh muc",
            name: combo.name || "Combo",
            price: Math.round(toFiniteNumber(combo.price) || 0),
            isActive: combo.isActive !== false,
            createdAt: nowIso,
            updatedAt: nowIso
        };

        const comboOverridePrice = normalizeOverridePrice(combo.priceOverride);
        if (comboOverridePrice !== null) comboPayload.priceOverride = Math.round(comboOverridePrice);

        const comboDoc = await databases.createDocument(DATABASE_ID, COMBOS_COLLECTION_ID, "unique()", comboPayload);
        const comboItems = Array.isArray(combo.items) ? combo.items : [];

        for (const item of comboItems) {
            const itemPayload = {
                weekId,
                comboId: comboDoc.$id,
                dishId: item.dishId,
                dishName: item.dishName || item.name || "Mon an",
                quantity: Math.max(1, Math.round(toFiniteNumber(item.quantity) || toFiniteNumber(item.qty) || 1)),
                createdAt: nowIso,
                updatedAt: nowIso
            };

            if (item.dishImageId || item.imageId) itemPayload.dishImageId = item.dishImageId || item.imageId;
            if (toFiniteNumber(item.basePrice) !== null) itemPayload.basePrice = Math.round(Number(item.basePrice));

            await databases.createDocument(DATABASE_ID, COMBO_ITEMS_COLLECTION_ID, "unique()", itemPayload);
        }
    }
}

module.exports = async ({ req, res, log, error }) => {
    try {
        const client = new sdk.Client()
            .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
            .setKey(req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY);

        const databases = new sdk.Databases(client);
        const body = parseRequestBody(req);

        const dishes = Array.isArray(body?.dishes) ? body.dishes : [];
        const combos = Array.isArray(body?.combos) ? body.combos : [];
        const weekId = body?.weekId || toWeekId(new Date());
        const nowIso = toIsoDateTime();

        await deleteDocumentsByQuery(databases, DAILY_MENU_COLLECTION_ID, [sdk.Query.equal("weekId", weekId)]);

        const existingCombos = await listAllDocuments(databases, COMBOS_COLLECTION_ID, [sdk.Query.equal("weekId", weekId)]);
        for (const combo of existingCombos) {
            await deleteDocumentsByQuery(databases, COMBO_ITEMS_COLLECTION_ID, [sdk.Query.equal("comboId", combo.$id)]);
            await databases.deleteDocument(DATABASE_ID, COMBOS_COLLECTION_ID, combo.$id);
        }

        await createDailyMenuDocuments(databases, weekId, dishes, nowIso);
        await createComboDocuments(databases, weekId, combos, nowIso);

        return res.json({
            ok: true,
            weekId,
            dishes: dishes.length,
            combos: combos.length
        }, 200);
    } catch (err) {
        error(err?.stack || err?.message || String(err));
        return res.json({
            ok: false,
            message: err?.message || "Failed to publish weekly schedule"
        }, 500);
    }
};
