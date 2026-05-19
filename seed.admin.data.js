const { Client, Databases, Query } = require("node-appwrite");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "69eb91050034ff637921";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "standard_444dbcf03f196cf09f5e5d68a851a3fb5a651bfdab75f861ba4218b4dda2bcb5062eae9cd73540638a5caaf7b455a0c09607496845acf6341a952e370437bfcd78019b9d237547652dda91a78a6b4dc9a3d37d2758c5adf4f3ef31883d7bfe587c026e5c04206b62762113bede5b3877bad1252c6823cf4c82e73ad2153b90c7";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "69eb95be00398251344a";

const COLLECTIONS = {
  categories: "categories",
  dishes: "dishes",
  dailyMenu: "daily_menu",
  combos: "combos",
  comboItems: "combo_items",
  weeklySchedules: "weekly_schedules"
};

const CATEGORY_SEED = [
  { slug: "main", name: "Mon chinh", description: "Mon chinh trong ngay", order: 1 },
  { slug: "side", name: "Mon an kem", description: "Mon phu va an kem", order: 2 },
  { slug: "drink", name: "Do uong", description: "Do uong theo ngay", order: 3 },
  { slug: "dessert", name: "Trang mieng", description: "Mon trang mieng", order: 4 }
];

const DISH_SEED = [
  { key: "main_com_ga", categorySlug: "main", name: "Com ga xoi mo", description: "Com ga xoi mo", price: 45000 },
  { key: "main_bun_bo", categorySlug: "main", name: "Bun bo Hue", description: "Bun bo Hue", price: 50000 },
  { key: "main_com_tam", categorySlug: "main", name: "Com tam suon", description: "Com tam suon", price: 48000 },
  { key: "main_pho_bo", categorySlug: "main", name: "Pho bo", description: "Pho bo tai", price: 52000 },
  { key: "side_cha_gio", categorySlug: "side", name: "Cha gio", description: "Cha gio chien gion", price: 25000 },
  { key: "side_salad", categorySlug: "side", name: "Salad rau tron", description: "Salad rau tron", price: 30000 },
  { key: "side_canh", categorySlug: "side", name: "Canh chua ca", description: "Canh chua ca", price: 35000 },
  { key: "drink_tra_dao", categorySlug: "drink", name: "Tra dao", description: "Tra dao mat lanh", price: 30000 },
  { key: "drink_ca_phe", categorySlug: "drink", name: "Ca phe sua da", description: "Ca phe sua da", price: 25000 },
  { key: "drink_nuoc_cam", categorySlug: "drink", name: "Nuoc cam", description: "Nuoc cam tuoi", price: 28000 },
  { key: "dessert_che", categorySlug: "dessert", name: "Che Thai", description: "Che Thai", price: 22000 },
  { key: "dessert_flan", categorySlug: "dessert", name: "Banh flan", description: "Banh flan caramel", price: 18000 }
];

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

function toSafeWeekDocId(weekId) {
  const safeWeekPart = String(weekId).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `week_${safeWeekPart}`.slice(0, 36);
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

async function findOne(databases, collectionId, queries = []) {
  const response = await databases.listDocuments(DATABASE_ID, collectionId, [
    ...queries,
    Query.limit(1)
  ]);
  return response.documents?.[0] || null;
}

async function upsertCategory(databases, seed, nowIso) {
  const existing = await findOne(databases, COLLECTIONS.categories, [
    Query.equal("slug", seed.slug)
  ]);
  const payload = {
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    order: seed.order,
    isActive: true,
    updatedAt: nowIso
  };

  if (existing) {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.categories, existing.$id, payload);
    return { ...existing, ...payload, $id: existing.$id };
  }

  return databases.createDocument(DATABASE_ID, COLLECTIONS.categories, "unique()", {
    ...payload,
    createdAt: nowIso
  });
}

async function upsertDish(databases, seed, category, nowIso) {
  const existing = await findOne(databases, COLLECTIONS.dishes, [
    Query.equal("name", seed.name),
    Query.equal("categoryId", category.$id)
  ]);
  const payload = {
    name: seed.name,
    description: seed.description,
    price: seed.price,
    categoryId: category.$id,
    categorySlug: category.slug,
    isAvailable: true,
    updatedAt: nowIso
  };

  if (existing) {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.dishes, existing.$id, payload);
    return { ...existing, ...payload, $id: existing.$id };
  }

  return databases.createDocument(DATABASE_ID, COLLECTIONS.dishes, "unique()", {
    ...payload,
    createdAt: nowIso
  });
}

function buildScheduleTemplate(dishesMap, categoriesMap) {
  const dayPlans = {
    mon: ["main_com_ga", "side_cha_gio", "drink_tra_dao", "dessert_che"],
    tue: ["main_bun_bo", "side_salad", "drink_ca_phe", "dessert_flan"],
    wed: ["main_com_tam", "side_canh", "drink_nuoc_cam", "dessert_che"],
    thu: ["main_pho_bo", "side_cha_gio", "drink_tra_dao", "dessert_flan"],
    fri: ["main_com_ga", "side_salad", "drink_nuoc_cam", "dessert_che"],
    sat: ["main_bun_bo", "side_canh", "drink_ca_phe", "dessert_flan"],
    sun: ["main_pho_bo", "side_cha_gio", "drink_tra_dao", "dessert_che"]
  };

  const dishes = [];
  Object.entries(dayPlans).forEach(([dayId, keys]) => {
    keys.forEach((key, index) => {
      const dish = dishesMap.get(key);
      if (!dish) return;
      const categoryId = dish.categoryId;
      const categoryName = categoriesMap.get(categoryId)?.name || "Danh muc";
      dishes.push({
        dayId,
        categoryId,
        categoryName,
        dishId: dish.$id,
        dishName: dish.name,
        dishImageId: dish.imageId || "",
        basePrice: Number(dish.price || 0),
        priceOverride: null,
        sortOrder: index,
        isActive: true
      });
    });
  });

  const comboMonItems = ["main_com_ga", "side_cha_gio", "drink_tra_dao"].map((key) => {
    const dish = dishesMap.get(key);
    return {
      dishId: dish.$id,
      dishName: dish.name,
      dishImageId: dish.imageId || "",
      quantity: 1,
      basePrice: Number(dish.price || 0)
    };
  });
  const comboFriItems = ["main_pho_bo", "side_salad", "drink_nuoc_cam"].map((key) => {
    const dish = dishesMap.get(key);
    return {
      dishId: dish.$id,
      dishName: dish.name,
      dishImageId: dish.imageId || "",
      quantity: 1,
      basePrice: Number(dish.price || 0)
    };
  });

  const combos = [
    {
      dayId: "mon",
      categoryId: "__combo__",
      categoryName: "Combo",
      name: "Combo Van Phong",
      price: 90000,
      priceOverride: null,
      isActive: true,
      items: comboMonItems
    },
    {
      dayId: "fri",
      categoryId: "__combo__",
      categoryName: "Combo",
      name: "Combo Cuoi Tuan",
      price: 98000,
      priceOverride: null,
      isActive: true,
      items: comboFriItems
    }
  ];

  return { dishes, combos };
}

async function replaceWeekDailyData(databases, weekId, dishes, combos, nowIso) {
  const oldDaily = await listAllDocuments(databases, COLLECTIONS.dailyMenu, [
    Query.equal("weekId", weekId)
  ]);
  for (const doc of oldDaily) {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.dailyMenu, doc.$id);
  }

  const oldCombos = await listAllDocuments(databases, COLLECTIONS.combos, [
    Query.equal("weekId", weekId)
  ]);
  for (const comboDoc of oldCombos) {
    const oldItems = await listAllDocuments(databases, COLLECTIONS.comboItems, [
      Query.equal("comboId", comboDoc.$id)
    ]);
    for (const item of oldItems) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.comboItems, item.$id);
    }
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.combos, comboDoc.$id);
  }

  for (const item of dishes) {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.dailyMenu, "unique()", {
      weekId,
      dayId: item.dayId,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      dishId: item.dishId,
      dishName: item.dishName,
      dishImageId: item.dishImageId || "",
      basePrice: Math.round(Number(item.basePrice || 0)),
      priceOverride: item.priceOverride,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Math.round(Number(item.sortOrder)) : 0,
      isActive: item.isActive !== false,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  for (const combo of combos) {
    const comboDoc = await databases.createDocument(DATABASE_ID, COLLECTIONS.combos, "unique()", {
      weekId,
      dayId: combo.dayId,
      categoryId: combo.categoryId,
      categoryName: combo.categoryName,
      name: combo.name,
      price: Math.round(Number(combo.price || 0)),
      priceOverride: combo.priceOverride,
      isActive: combo.isActive !== false,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    for (const item of combo.items || []) {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.comboItems, "unique()", {
        comboId: comboDoc.$id,
        dishId: item.dishId,
        dishName: item.dishName,
        dishImageId: item.dishImageId || "",
        quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
        basePrice: Math.round(Number(item.basePrice || 0))
      });
    }
  }
}

async function upsertWeeklyScheduleDoc(databases, weekId, dishes, combos, nowIso) {
  const documentId = toSafeWeekDocId(weekId);
  const payload = {
    weekId,
    scheduleJson: JSON.stringify({ dishes, combos }),
    dishesCount: dishes.length,
    combosCount: combos.length,
    publishedAt: nowIso,
    updatedAt: nowIso
  };

  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.weeklySchedules, documentId, payload);
  } catch (error) {
    const statusCode = Number(error?.code || 0);
    const errorType = String(error?.type || "");
    const message = String(error?.message || "").toLowerCase();
    const isDocNotFound = statusCode === 404 && (errorType === "document_not_found" || message.includes("document with the requested id"));
    if (!isDocNotFound) throw error;

    await databases.createDocument(DATABASE_ID, COLLECTIONS.weeklySchedules, documentId, {
      ...payload,
      createdAt: nowIso
    });
  }
}

async function seed() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const databases = new Databases(client);
  const nowIso = toIsoDateTime();
  const weekId = toWeekId(new Date());

  const categoriesBySlug = new Map();
  for (const categorySeed of CATEGORY_SEED) {
    const category = await upsertCategory(databases, categorySeed, nowIso);
    categoriesBySlug.set(categorySeed.slug, category);
  }

  const categoriesById = new Map();
  categoriesBySlug.forEach((category) => {
    categoriesById.set(category.$id, category);
  });

  const dishesByKey = new Map();
  for (const dishSeed of DISH_SEED) {
    const category = categoriesBySlug.get(dishSeed.categorySlug);
    if (!category) {
      throw new Error(`Khong tim thay category slug=${dishSeed.categorySlug}`);
    }
    const dish = await upsertDish(databases, dishSeed, category, nowIso);
    dishesByKey.set(dishSeed.key, dish);
  }

  const schedule = buildScheduleTemplate(dishesByKey, categoriesById);
  await replaceWeekDailyData(databases, weekId, schedule.dishes, schedule.combos, nowIso);
  await upsertWeeklyScheduleDoc(databases, weekId, schedule.dishes, schedule.combos, nowIso);

  console.log("Seed completed.");
  console.log(`Week: ${weekId}`);
  console.log(`Categories: ${CATEGORY_SEED.length}`);
  console.log(`Dishes: ${DISH_SEED.length}`);
  console.log(`Schedule dishes: ${schedule.dishes.length}`);
  console.log(`Schedule combos: ${schedule.combos.length}`);
}

seed().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
