const { Client, Databases, Query } = require("node-appwrite");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

const COLLECTIONS = {
  categories: "categories",
  weeklySchedules: "weekly_schedules"
};

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

async function listAllDocuments(databases, collectionId, queries = []) {
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
    offset += (response.documents || []).length;
    if (!(response.documents || []).length) break;
  }

  return documents;
}

function parseScheduleJson(raw) {
  if (!raw) return { dishes: [], combos: [] };
  if (typeof raw === "object") {
    return {
      dishes: Array.isArray(raw.dishes) ? raw.dishes : [],
      combos: Array.isArray(raw.combos) ? raw.combos : []
    };
  }
  if (typeof raw !== "string") return { dishes: [], combos: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      dishes: Array.isArray(parsed?.dishes) ? parsed.dishes : [],
      combos: Array.isArray(parsed?.combos) ? parsed.combos : []
    };
  } catch (error) {
    console.error("Khong parse duoc scheduleJson:", error);
    return { dishes: [], combos: [] };
  }
}

async function main() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID) {
    console.error("Missing env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID");
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const databases = new Databases(client);

  const categories = await listAllDocuments(databases, COLLECTIONS.categories, [Query.limit(200)]);
  const resolveCategoryName = buildCategoryNameResolver(categories);

  const schedules = await listAllDocuments(databases, COLLECTIONS.weeklySchedules, [Query.orderDesc("$updatedAt")]);

  let updatedCount = 0;
  for (const schedule of schedules) {
    const { dishes, combos } = parseScheduleJson(schedule?.scheduleJson);
    if (!dishes.length && !combos.length) continue;

    const nextDishes = dishes.map((entry) => ({
      ...entry,
      categoryName: resolveCategoryName(entry?.categoryId, entry?.categoryName)
    }));
    const nextCombos = combos.map((entry) => ({
      ...entry,
      categoryName: resolveCategoryName(entry?.categoryId, entry?.categoryName)
    }));

    const nextJson = JSON.stringify({ dishes: nextDishes, combos: nextCombos });
    if (nextJson === schedule?.scheduleJson) continue;

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.weeklySchedules, schedule.$id, {
      scheduleJson: nextJson,
      updatedAt: new Date().toISOString()
    });
    updatedCount += 1;
  }

  console.log(`Updated weekly_schedules: ${updatedCount}`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
