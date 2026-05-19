import { renderDataTable } from "./table.js";
import { escapeHtml } from "../../../shared/js/utils.js";
import { getGalleryMediaUrl } from "../data/gallery-service.js";
import { APPWRITE_CONFIG } from "../../../shared/js/config.js";

const GALLERY_PAGE_LIMIT = 8;

function normalizeGalleryOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isGalleryPublished(value) {
  return String(value) !== "false";
}

function renderPagination(currentPage, totalPages, type) {
  if (totalPages <= 1) return "";
  let html = `<div class="pagination" data-type="${type}">`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? "active" : ""}" data-page="${i}" data-type="${type}">${i}</button>`;
  }
  html += `</div>`;
  return html;
}

function renderPreview(media) {
  const url = getGalleryMediaUrl(media.fileId, APPWRITE_CONFIG.PROJECT_ID);
  if (!url) return '<span class="gallery-empty-thumb">—</span>';
  if (media.mediaType === "video") {
    return `<video class="gallery-thumb" muted playsinline preload="metadata" src="${url}"></video>`;
  }
  return `<img class="gallery-thumb" src="${url}" alt="${escapeHtml(media.title || "Thư viện")}" />`;
}

export function renderGalleryMediaTable(mediaItems) {
  const rows = mediaItems
    .map((media) => {
      const published = isGalleryPublished(media.isPublished);
      const statusLabel = published ? "Hiển thị" : "Ẩn";
      const typeLabel = media.mediaType === "video" ? "Video" : "Ảnh";
      return `
        <tr data-id="${media.$id}">
          <td class="gallery-preview-cell">${renderPreview(media)}</td>
          <td><div class="entity-cell"><strong>${escapeHtml(media.title || "(Chưa đặt tiêu đề)")}</strong><span>${escapeHtml(media.description || "Mục thư viện chưa có mô tả.")}</span></div></td>
          <td><span class="category-pill">${typeLabel}</span></td>
          <td><span class="order-pill ${published ? "" : "muted"}">${statusLabel}</span></td>
          <td><span class="order-pill">${normalizeGalleryOrder(media.order)}</span></td>
          <td>${escapeHtml(media.$updatedAt ? new Date(media.$updatedAt).toLocaleDateString("vi-VN") : "—")}</td>
          <td><div class="action-group"><button type="button" class="action-btn icon-btn edit-gallery-media" data-id="${media.$id}" title="Sửa media"><i class="fas fa-pen"></i></button><button type="button" class="action-btn icon-btn delete delete-gallery-media" data-id="${media.$id}" title="Xóa media"><i class="fas fa-trash"></i></button></div></td>
        </tr>
      `;
    })
    .join("");

  return renderDataTable({
    tableClass: "data-table stable-cols gallery-cols",
    colgroup: `<col class="col-preview" /><col class="col-name" /><col class="col-type" /><col class="col-status" /><col class="col-order" /><col class="col-updated" /><col class="col-actions" />`,
    headers: ["Xem trước", "Tiêu đề", "Loại", "Trạng thái", "Thứ tự", "Cập nhật", "Thao tác"],
    rows,
    emptyMessage: "Chưa có ảnh hoặc video nào. Hãy tải lên mục đầu tiên.",
  });
}

export function renderGalleryManagerTemplate({ totalItems, totalImages, totalVideos, galleryTableHtml, galleryPaginationHtml, filterSelectHtml }) {
  return `
    <section class="gallery-manager-shell">
      <div class="menu-manager-toolbar">
        <div class="menu-toolbar-copy">
          <h2>Thư viện ảnh & video</h2>
          <p>Quản lý nội dung hiển thị ở trang thư viện ảnh của khách hàng.</p>
        </div>
        <div class="menu-toolbar-stats">
          <div class="menu-toolbar-stat"><span class="menu-toolbar-label">Tổng mục</span><strong>${totalItems}</strong><span>Đã tải lên</span></div>
          <div class="menu-toolbar-stat"><span class="menu-toolbar-label">Ảnh</span><strong>${totalImages}</strong><span>Media ảnh</span></div>
          <div class="menu-toolbar-stat"><span class="menu-toolbar-label">Video</span><strong>${totalVideos}</strong><span>Media video</span></div>
        </div>
      </div>
      <div class="menu-grid">
        <section class="menu-panel menu-panel-wide">
          <div class="admin-section-header">
            <div><h3>Danh sách media</h3><p class="section-note">Tải ảnh hoặc video từ máy tính lên để hiển thị ngoài trang khách.</p></div>
            <div style="display:flex; gap:8px; align-items:center;">
              ${filterSelectHtml}
              <button id="openAddGalleryMediaBtn" class="btn-primary btn-icon-circle" type="button" title="Thêm media"><i class="fas fa-plus"></i></button>
            </div>
          </div>
          <div id="galleryTableContainer" class="admin-table menu-table-card">
            ${galleryTableHtml}
            ${galleryPaginationHtml}
          </div>
        </section>
      </div>
    </section>
    <div id="galleryModal" class="modal">
      <div class="modal-content modal-content-menu">
        <div class="modal-head">
          <div><h3 id="galleryModalTitle">Thêm mới</h3><p class="section-note">Chọn file từ máy tính và lưu để hiển thị trên trang thư viện.</p></div>
          <button id="cancelGalleryModalTop" class="modal-close" type="button" title="Đóng"><i class="fas fa-times"></i></button>
        </div>
        <div id="galleryModalBody" class="menu-modal-body"></div>
        <div class="modal-actions">
          <button id="cancelGalleryModal" class="btn-secondary">Hủy</button>
          <button id="saveGalleryModal" class="btn-primary">Lưu thay đổi</button>
        </div>
      </div>
    </div>
  `;
}

export function buildGalleryFilterSelect({ value = "all" } = {}) {
  return `
    <select id="galleryTypeFilter" class="admin-select gallery-type-filter">
      <option value="all" ${value === "all" ? "selected" : ""}>Tất cả</option>
      <option value="image" ${value === "image" ? "selected" : ""}>Ảnh</option>
      <option value="video" ${value === "video" ? "selected" : ""}>Video</option>
    </select>
  `;
}

export function renderGalleryFormHTML(media = null, existingUrl = "") {
  const mediaType = media?.mediaType || "image";
  const previewMarkup = existingUrl
    ? (mediaType === "video"
      ? `<video id="galleryMediaPreview" class="gallery-media-preview" controls preload="metadata" src="${existingUrl}"></video>`
      : `<img id="galleryMediaPreview" class="gallery-media-preview" src="${existingUrl}" alt="${escapeHtml(media?.title || "Media")}" />`)
    : `<div id="galleryMediaPlaceholder" class="gallery-media-placeholder"><i class="fas fa-image"></i><span>Chưa có file</span></div>`;

  return `
    <div class="gallery-form-grid">
      <div class="gallery-form-main">
        <label class="field-label">Tiêu đề</label>
        <input type="text" id="galleryTitle" class="form-input" value="${escapeHtml(media?.title || "")}" placeholder="Nhập tiêu đề media" />

        <label class="field-label">Mô tả</label>
        <textarea id="galleryDesc" class="form-textarea" rows="4" placeholder="Mô tả ngắn cho ảnh/video">${escapeHtml(media?.description || "")}</textarea>

        <div class="gallery-form-row">
          <div>
            <label class="field-label">Loại</label>
            <select id="galleryMediaType" class="form-input">
              <option value="image" ${mediaType === "image" ? "selected" : ""}>Ảnh</option>
              <option value="video" ${mediaType === "video" ? "selected" : ""}>Video</option>
            </select>
          </div>
          <div>
            <label class="field-label">Thứ tự</label>
            <input type="number" id="galleryOrder" class="form-input" value="${normalizeGalleryOrder(media?.order)}" min="0" step="1" />
          </div>
        </div>

        <label class="gallery-toggle">
          <input type="checkbox" id="galleryPublished" ${isGalleryPublished(media?.isPublished) ? "checked" : ""} />
          <span>Hiển thị trên trang khách</span>
        </label>

        <label class="field-label">Tải file từ máy tính</label>
        <input type="file" id="galleryFile" class="form-input" accept="image/*,video/*" />
        <p class="field-hint">Chọn ảnh hoặc video. File mới sẽ thay thế file cũ nếu đang sửa.</p>
      </div>
      <div class="gallery-form-preview" id="galleryMediaPicker">
        ${previewMarkup}
      </div>
    </div>
  `;
}