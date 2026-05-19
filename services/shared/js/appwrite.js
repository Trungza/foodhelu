import { APPWRITE_CONFIG, DB } from "./config.js";

export const client = new window.Appwrite.Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new window.Appwrite.Account(client);
export const databases = new window.Appwrite.Databases(client);
export const storage = new window.Appwrite.Storage(client);
export const Query = window.Appwrite.Query;
export const Realtime  = window.Appwrite.Realtime;
export const ID = window.Appwrite.ID;

export const DATABASE_ID = DB.DATABASE_ID;
export const BUCKET_ID = APPWRITE_CONFIG.BUCKET_ID;
export const Permission = window.Appwrite.Permission;
export const Role = window.Appwrite.Role;