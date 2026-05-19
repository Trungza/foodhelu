import { databases, DATABASE_ID, ID, client } from "./appwrite.js";
import { DB } from "./config.js";

const COLLECTION_ID = DB.COLLECTIONS.SYSTEM_SETTINGS || "system_settings";
const DOC_ID = "global";

export const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  acceptingOrders: true,
  kitchenOverloaded: false,
  updatedAt: "",
});

export async function getSystemSettings() {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, DOC_ID);
    return {
      acceptingOrders: doc.acceptingOrders !== false,
      kitchenOverloaded: doc.kitchenOverloaded === true,
      updatedAt: doc.updatedAt || doc.$updatedAt || "",
    };
  } catch (err) {
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
}

export async function setSystemSettings(patch) {
  const current = await getSystemSettings();
  
  // Only include attributes defined in your Appwrite collection schema
  const payload = {
    acceptingOrders: patch.acceptingOrders !== undefined ? patch.acceptingOrders : current.acceptingOrders,
    kitchenOverloaded: patch.kitchenOverloaded !== undefined ? patch.kitchenOverloaded : current.kitchenOverloaded,
  };

  try {
    const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, DOC_ID, payload);
    return { ...payload, updatedAt: doc.$updatedAt };
  } catch (err) {
    const code = Number(err?.code || 0);
    if (code !== 404) throw err;
    const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, DOC_ID, payload);
    return { ...payload, updatedAt: doc.$updatedAt };
  }
}

export function subscribeSystemSettings(onChange) {
  if (!client || !DATABASE_ID) return () => {};
  const channel = `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`;
  const unsub = client.subscribe(channel, (response) => {
    const isCreate = response.events.some((e) => e.includes(".create"));
    const isUpdate = response.events.some((e) => e.includes(".update"));
    if (!isCreate && !isUpdate) return;
    const doc = response.payload;
    if (!doc || doc.$id !== DOC_ID) return;
    onChange?.({
      acceptingOrders: doc.acceptingOrders !== false,
      kitchenOverloaded: doc.kitchenOverloaded === true,
      updatedAt: doc.updatedAt || doc.$updatedAt || "",
    });
  });
  return () => {
    try {
      unsub?.();
    } catch {}
  };
}
