import { APPWRITE_CONFIG, DB } from "../../shared/js/config.js";
import { databases, Query, DATABASE_ID } from "../../shared/js/appwrite.js";

const COLLECTION_ID = DB.COLLECTIONS.GALLERY_MEDIA;
const PROJECT_ID = APPWRITE_CONFIG.PROJECT_ID;

function normalizeGalleryOrder(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function isGalleryPublished(value) {
    return String(value) !== "false";
}

function escapeHtml(value) {
    if (!value) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getFileUrl(fileId) {
    if (!fileId) return "";
    return `${APPWRITE_CONFIG.ENDPOINT}/storage/buckets/${APPWRITE_CONFIG.BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
}

function sortGalleryItems(items) {
    return [...items].sort((a, b) => {
        const orderDiff = normalizeGalleryOrder(a?.order) - normalizeGalleryOrder(b?.order);
        if (orderDiff !== 0) return orderDiff;
        return String(b?.$createdAt || "").localeCompare(String(a?.$createdAt || ""));
    });
}

async function fetchAllDocuments(collectionId, queries = []) {
    const limit = 100;
    const documents = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
        const response = await databases.listDocuments(DATABASE_ID, collectionId, [...queries, Query.limit(limit), Query.offset(offset)]);
        const chunk = response?.documents || [];
        total = Number(response?.total || 0);
        documents.push(...chunk);
        offset += chunk.length;
        if (!chunk.length) break;
    }

    return documents;
}

async function fetchGalleryItems() {
    const remoteItems = await fetchAllDocuments(COLLECTION_ID, [Query.orderDesc("$createdAt")]);
    return sortGalleryItems(remoteItems);
}

function setStats(items) {
    const total = items.length;
    const imageCount = items.filter((item) => item.mediaType !== "video").length;
    const videoCount = items.filter((item) => item.mediaType === "video").length;

    const totalEl = document.getElementById("galleryCountAll");
    const imageEl = document.getElementById("galleryCountImages");
    const videoEl = document.getElementById("galleryCountVideos");
    if (totalEl) totalEl.textContent = String(total);
    if (imageEl) imageEl.textContent = String(imageCount);
    if (videoEl) videoEl.textContent = String(videoCount);
}

function createFilterButtons(activeType = "all") {
    const filtersEl = document.getElementById("galleryFilters");
    if (!filtersEl) return;
    const filters = [
        { value: "all", label: "Tất cả" },
        { value: "image", label: "Ảnh" },
        { value: "video", label: "Video" },
    ];
    filtersEl.innerHTML = filters.map((filter) => `
        <button type="button" class="gallery-filter-btn ${activeType === filter.value ? "active" : ""}" data-type="${filter.value}">${filter.label}</button>
    `).join("");
}

function renderItems(items, type = "all") {
    const grid = document.getElementById("galleryGrid");
    if (!grid) return;

    const filtered = type === "all" ? items : items.filter((item) => item.mediaType === type);
    if (!filtered.length) {
        grid.innerHTML = `
            <div class="gallery-empty">
                <i class="fas fa-image"></i>
                <span>Chưa có media nào trong thư viện.</span>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map((item) => {
        const url = getFileUrl(item.fileId);
        const typeLabel = item.mediaType === "video" ? "Video" : "Ảnh";
        const mediaMarkup = item.mediaType === "video"
            ? `<video muted playsinline preload="metadata" src="${url}"></video>`
            : `<img src="${url}" alt="${escapeHtml(item.title || "Thư viện")}" loading="lazy" />`;

        return `
            <article class="gallery-card" data-id="${item.$id}" data-type="${item.mediaType || "image"}">
                <div class="gallery-media">
                    <span class="gallery-badge">${typeLabel}</span>
                    ${mediaMarkup}
                </div>
                <div class="gallery-body">
                    <h3>${escapeHtml(item.title || "Mục thư viện")}</h3>
                    <p>${escapeHtml(item.description || "")}</p>
                    <div class="gallery-meta">
                        <span>${isGalleryPublished(item.isPublished) ? "Đang hiển thị" : "Đã ẩn"}</span>
                        <span>#${normalizeGalleryOrder(item.order)}</span>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function openLightbox(item) {
    const lightbox = document.getElementById("galleryLightbox");
    const content = document.getElementById("galleryLightboxContent");
    if (!lightbox || !content) return;
    const url = getFileUrl(item.fileId);
    content.innerHTML = item.mediaType === "video"
        ? `<video controls autoplay muted playsinline src="${url}"></video>`
        : `<img src="${url}" alt="${escapeHtml(item.title || "Thư viện")}" />`;
    lightbox.hidden = false;
}

function closeLightbox() {
    const lightbox = document.getElementById("galleryLightbox");
    const content = document.getElementById("galleryLightboxContent");
    if (lightbox) lightbox.hidden = true;
    if (content) content.innerHTML = "";
}

function bindEvents(items) {
    const filtersEl = document.getElementById("galleryFilters");
    let activeType = "all";

    filtersEl?.addEventListener("click", (event) => {
        const btn = event.target.closest(".gallery-filter-btn");
        if (!btn) return;
        activeType = btn.dataset.type || "all";
        createFilterButtons(activeType);
        renderItems(items, activeType);
    });

    const grid = document.getElementById("galleryGrid");
    grid?.addEventListener("click", (event) => {
        const card = event.target.closest(".gallery-card");
        if (!card) return;
        const item = items.find((entry) => entry.$id === card.dataset.id);
        if (item) openLightbox(item);
    });

    const closeBtn = document.getElementById("galleryLightboxClose");
    closeBtn?.addEventListener("click", closeLightbox);
    const lightbox = document.getElementById("galleryLightbox");
    lightbox?.addEventListener("click", (event) => {
        if (event.target === lightbox) closeLightbox();
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeLightbox();
    });
}

async function initGalleryPage() {
    const grid = document.getElementById("galleryGrid");
    if (!grid) return;

    try {
        const items = await fetchGalleryItems();
        setStats(items);
        createFilterButtons("all");
        renderItems(items, "all");
        bindEvents(items);
    } catch (error) {
        grid.innerHTML = `
            <div class="gallery-empty">
                <i class="fas fa-triangle-exclamation"></i>
                <span>Không thể tải thư viện ảnh.</span>
            </div>
        `;
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", initGalleryPage);