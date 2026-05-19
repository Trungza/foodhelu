import {
  databases,
  storage,
  Query,
  DATABASE_ID,
  BUCKET_ID,
  ID,
  Permission,
  Role
} from "../../../shared/js/appwrite.js";

import { APPWRITE_CONFIG, DB } from "../../../shared/js/config.js";

const { COLLECTIONS } = DB;

function isFileType(value) {
  return String(value || "").toLowerCase() === "video";
}

function isCollectionMissing(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    String(error?.type || "") === "collection_not_found" ||
    message.includes("collection with the requested id")
  );
}

export async function fetchGalleryMedia(
  page = 1,
  limit = 8,
  mediaType = "all"
) {
  const offset = (page - 1) * limit;

  const queries = [
    Query.orderDesc("order"),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
    Query.offset(offset)
  ];

  if (mediaType && mediaType !== "all") {
    queries.unshift(Query.equal("mediaType", mediaType));
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GALLERY_MEDIA,
    queries
  );

  return {
    documents: response.documents || [],
    total: response.total || 0
  };
}

export async function fetchAllGalleryMedia(limit = 1000) {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GALLERY_MEDIA,
    [Query.limit(limit)]
  );

  return response.documents || [];
}

export function getGalleryMediaUrl(
  fileId,
  projectId = APPWRITE_CONFIG.PROJECT_ID
) {
  if (!fileId) return "";

  return `${APPWRITE_CONFIG.ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${projectId}`;
}

export async function getGalleryMediaById(mediaId) {
  return databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.GALLERY_MEDIA,
    mediaId
  );
}

export async function createGalleryMedia(data) {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.GALLERY_MEDIA,
      ID.unique(),
      data,
      [
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]
    );
  } catch (error) {
    console.error("Create gallery media error:", error);
    throw error;
  }
}

export async function updateGalleryMedia(mediaId, data) {
  try {
    const existing = await getGalleryMediaById(mediaId);

    if (
      existing &&
      existing.fileId &&
      data.fileId &&
      data.fileId !== existing.fileId
    ) {
      await storage.deleteFile(BUCKET_ID, existing.fileId);
    }
  } catch (error) {
    if (!isCollectionMissing(error)) {
      console.warn(
        "Không thể xóa file gallery cũ khi cập nhật:",
        error
      );
    }
  }

  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.GALLERY_MEDIA,
    mediaId,
    data,
    [
      Permission.read(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any())
    ]
  );
}

export async function deleteGalleryMedia(mediaId) {
  try {
    const existing = await getGalleryMediaById(mediaId);

    if (existing?.fileId) {
      await storage.deleteFile(BUCKET_ID, existing.fileId);
    }
  } catch (error) {
    if (!isCollectionMissing(error)) {
      console.warn("Không thể xóa file gallery:", error);
    }
  }

  return databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.GALLERY_MEDIA,
    mediaId
  );
}

export async function uploadGalleryFile(file) {
  return storage.createFile(
    BUCKET_ID,
    ID.unique(),
    file
  );
}

export function inferGalleryType(file = null, mediaType = "image") {
  if (isFileType(mediaType)) return "video";

  const mime = String(file?.type || "").toLowerCase();

  if (mime.startsWith("video/")) {
    return "video";
  }

  return "image";
}