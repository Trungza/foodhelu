import { renderInlineLoading } from "../../../shared/components/loading-component.js";
import { renderSelect } from "../../../shared/components/select-component.js";
import { showConfirmDialog } from "../../../shared/components/dialog.js";
import { escapeHtml } from "../../../shared/js/utils.js";
import { client, DATABASE_ID } from "../../../shared/js/appwrite.js";
import { APPWRITE_CONFIG, DB } from "../../../shared/js/config.js";
import { galleryManageStyle } from "../style/gallery-manager.js";
import {
  createGalleryMedia,
  deleteGalleryMedia,
  fetchAllGalleryMedia,
  fetchGalleryMedia,
  getGalleryMediaById,
  getGalleryMediaUrl,
  inferGalleryType,
  updateGalleryMedia,
  uploadGalleryFile,
} from "../data/gallery-service.js";
import {
  buildGalleryFilterSelect,
  renderGalleryFormHTML,
  renderGalleryManagerTemplate,
  renderGalleryMediaTable,
} from "../renderers/gallery-manager.js";

const PAGE_SIZE = 8;
let currentGalleryPage = 1;
let currentGalleryType = "all";
let currentGalleryId = null;
let currentGalleryFileId = null;

if (!document.querySelector("#admin-gallery-manager-styles")) {
  const style = document.createElement("style");
  style.id = "admin-gallery-manager-styles";
  style.textContent = galleryManageStyle;
  document.head.appendChild(style);
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

async function loadGalleryState(page = currentGalleryPage, mediaType = currentGalleryType) {
  const result = await fetchGalleryMedia(page, PAGE_SIZE, mediaType);
  const allItems = await fetchAllGalleryMedia();
  const totalPages = Math.ceil(result.total / PAGE_SIZE);
  const totalImages = allItems.filter((item) => item.mediaType !== "video").length;
  const totalVideos = allItems.filter((item) => item.mediaType === "video").length;
  return {
    items: result.documents,
    total: result.total,
    totalPages,
    totalImages,
    totalVideos,
  };
}

export async function renderGalleryManager() {
  let state = { items: [], total: 0, totalPages: 0, totalImages: 0, totalVideos: 0 };
  try {
    state = await loadGalleryState();
  } catch (error) {
    console.warn("Không tải được gallery media:", error);
  }
  const galleryTableHtml = renderGalleryMediaTable(state.items);
  const galleryPaginationHtml = renderPagination(currentGalleryPage, state.totalPages, "gallery");
  const filterSelectHtml = buildGalleryFilterSelect({ value: currentGalleryType });
  return renderGalleryManagerTemplate({
    totalItems: state.total,
    totalImages: state.totalImages,
    totalVideos: state.totalVideos,
    galleryTableHtml,
    galleryPaginationHtml,
    filterSelectHtml,
  });
}

function setLoading(saveBtn, isLoading) {
  if (!saveBtn) return;
  saveBtn.disabled = isLoading;
  saveBtn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...' : "Lưu thay đổi";
}

function cleanupPreviewUrl(modalBody) {
  const preview = modalBody?.querySelector("#galleryMediaPreview");
  const objectUrl = preview?.dataset.objectUrl;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  if (preview?.dataset.objectUrl) delete preview.dataset.objectUrl;
}

function updatePreview(modalBody, file = null, mediaType = "image", existingUrl = "") {
  const previewBox = modalBody?.querySelector("#galleryMediaPicker");
  const preview = modalBody?.querySelector("#galleryMediaPreview");
  const placeholder = modalBody?.querySelector("#galleryMediaPlaceholder");
  if (!previewBox) return;

  cleanupPreviewUrl(modalBody);

  if (file) {
    const objectUrl = URL.createObjectURL(file);
    const isVideo = inferGalleryType(file, mediaType) === "video";
    previewBox.innerHTML = isVideo
      ? `<video id="galleryMediaPreview" class="gallery-media-preview" controls preload="metadata" src="${objectUrl}"></video>`
      : `<img id="galleryMediaPreview" class="gallery-media-preview" src="${objectUrl}" alt="Xem trước media" />`;
    previewBox.querySelector("#galleryMediaPreview").dataset.objectUrl = objectUrl;
    return;
  }

  if (existingUrl) {
    const isVideo = mediaType === "video";
    previewBox.innerHTML = isVideo
      ? `<video id="galleryMediaPreview" class="gallery-media-preview" controls preload="metadata" src="${existingUrl}"></video>`
      : `<img id="galleryMediaPreview" class="gallery-media-preview" src="${existingUrl}" alt="Xem trước media" />`;
    return;
  }

  previewBox.innerHTML = `
    <div id="galleryMediaPlaceholder" class="gallery-media-placeholder">
      <i class="fas fa-image"></i>
      <span>Chưa có file</span>
    </div>
  `;
}

function normalizeGalleryOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "0";
}

function normalizeGalleryPublished(value) {
  return value === false ? "false" : "true";
}

async function refreshGalleryTable(root) {
  const container = root.querySelector("#galleryTableContainer");
  if (!container) return;
  const table = container.querySelector("table");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  const thead = table.querySelector("thead");
  if (!tbody || !thead) return;

  const colCount = thead.querySelectorAll("th").length;
  tbody.innerHTML = renderInlineLoading({ message: "Đang tải thư viện...", colspan: colCount });

  try {
    const state = await loadGalleryState();
    const newFullHtml = renderGalleryMediaTable(state.items);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = newFullHtml;
    const newTbody = tempDiv.querySelector("tbody");
    if (newTbody) tbody.innerHTML = newTbody.innerHTML;
    const paginationDiv = container.querySelector(".pagination");
    const newPagination = renderPagination(currentGalleryPage, state.totalPages, "gallery");
    if (paginationDiv) paginationDiv.outerHTML = newPagination;
    else if (newPagination) container.insertAdjacentHTML("beforeend", newPagination);

    const stats = root.querySelectorAll(".menu-toolbar-stat strong");
    const statLabels = root.querySelectorAll(".menu-toolbar-stat span:last-child");
    if (stats[0]) stats[0].innerText = String(state.total);
    if (stats[1]) stats[1].innerText = String(state.totalImages);
    if (stats[2]) stats[2].innerText = String(state.totalVideos);
    if (statLabels[0]) statLabels[0].innerText = "Đã tải lên";
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">Lỗi tải dữ liệu</td></tr>`;
  }
}

export function initGalleryManagerEvents(root) {
  const modal = root.querySelector("#galleryModal");
  const modalTitle = root.querySelector("#galleryModalTitle");
  const modalBody = root.querySelector("#galleryModalBody");
  const cancelBtn = root.querySelector("#cancelGalleryModal");
  const cancelTopBtn = root.querySelector("#cancelGalleryModalTop");
  const saveBtn = root.querySelector("#saveGalleryModal");

  function setModalContent(html) {
    if (modalBody) modalBody.innerHTML = html;
  }

  function openGalleryModal(media = null) {
    currentGalleryId = media?.$id || null;
    currentGalleryFileId = media?.fileId || null;
    modalTitle.innerText = media ? "Sửa media" : "Thêm media mới";
    const existingUrl = media?.fileId ? getGalleryMediaUrl(media.fileId, APPWRITE_CONFIG.PROJECT_ID) : "";
    setModalContent(renderGalleryFormHTML(media, existingUrl));
    modal.classList.add("active");
    const fileInput = modalBody?.querySelector("#galleryFile");
    const typeSelect = modalBody?.querySelector("#galleryMediaType");
    const previewBox = modalBody?.querySelector("#galleryMediaPicker");
    if (previewBox && fileInput) {
      previewBox.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0] || null;
        const mediaType = typeSelect?.value || "image";
        updatePreview(modalBody, file, mediaType, existingUrl);
      });
    }
    typeSelect?.addEventListener("change", () => {
      const selectedFile = fileInput?.files?.[0] || null;
      updatePreview(modalBody, selectedFile, typeSelect.value, existingUrl);
    });
    updatePreview(modalBody, null, media?.mediaType || "image", existingUrl);
  }

  async function saveGalleryMedia() {
    const titleInput = modalBody?.querySelector("#galleryTitle");
    const descInput = modalBody?.querySelector("#galleryDesc");
    const typeSelect = modalBody?.querySelector("#galleryMediaType");
    const orderInput = modalBody?.querySelector("#galleryOrder");
    const publishInput = modalBody?.querySelector("#galleryPublished");
    const fileInput = modalBody?.querySelector("#galleryFile");
    if (!titleInput || !typeSelect || !orderInput || !publishInput) return;

    const title = titleInput.value.trim();
    const description = descInput?.value.trim() || "";
    const order = normalizeGalleryOrder(orderInput.value);
    const isPublished = normalizeGalleryPublished(publishInput.checked);
    const chosenFile = fileInput?.files?.[0] || null;
    const mediaType = chosenFile ? inferGalleryType(chosenFile, typeSelect.value) : typeSelect.value;

    if (!title) {
      window.showToast("Tiêu đề không được để trống", "error");
      return;
    }

    setLoading(saveBtn, true);
    try {
      let fileId = currentGalleryFileId;
      if (chosenFile) {
        const upload = await uploadGalleryFile(chosenFile);
        fileId = upload.$id;
        currentGalleryFileId = upload.$id;
      }

      if (!fileId) {
        window.showToast("Vui lòng chọn file ảnh hoặc video", "error");
        return;
      }

      const payload = {
        title,
        description,
        mediaType,
        fileId,
        order,
        isPublished,
      };

      if (currentGalleryId) {
        await updateGalleryMedia(currentGalleryId, payload);
        window.showToast("Cập nhật media thành công", "success");
      } else {
        await createGalleryMedia(payload);
        window.showToast("Thêm media thành công", "success");
      }

      modal.classList.remove("active");
      await refreshGalleryTable(root);
    } catch (error) {
      const message = String(error?.message || error || "");
      let userMessage = "Lỗi: " + message;
      if (message.includes("gallery_media") || message.includes("collection")) {
        userMessage = "Lỗi: Collection 'gallery_media' chưa được tạo trên Appwrite. Hãy chạy setup script hoặc kiểm tra kết nối API.";
      }
      window.showToast(userMessage, "error");
      console.error("Gallery save error:", error);
    } finally {
      setLoading(saveBtn, false);
    }
  }

  const galleryFilter = root.querySelector("#galleryTypeFilter");
  galleryFilter?.addEventListener("change", async (event) => {
    currentGalleryType = event.target.value || "all";
    currentGalleryPage = 1;
    await refreshGalleryTable(root);
  });

  if (root._galleryManagerClickHandler) {
    root.removeEventListener("click", root._galleryManagerClickHandler);
  }

  const clickHandler = async (event) => {
    if (event.target.closest("#openAddGalleryMediaBtn")) {
      openGalleryModal();
      return;
    }

    const pageBtn = event.target.closest(".pagination-btn");
    if (pageBtn && pageBtn.dataset.type === "gallery") {
      currentGalleryPage = Number(pageBtn.dataset.page) || 1;
      await refreshGalleryTable(root);
      return;
    }

    const editBtn = event.target.closest(".edit-gallery-media");
    if (editBtn) {
      try {
        const media = await getGalleryMediaById(editBtn.getAttribute("data-id"));
        openGalleryModal(media);
      } catch (error) {
        window.showToast("Lỗi tải media", "error");
      }
      return;
    }

    const deleteBtn = event.target.closest(".delete-gallery-media");
    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      const accepted = await showConfirmDialog({
        title: "Xác nhận xóa media",
        message: "Bạn có chắc chắn muốn xóa mục thư viện này không?",
        confirmText: "Xóa",
        cancelText: "Hủy",
        confirmType: "danger",
      });
      if (!accepted) return;
      setLoading(saveBtn, true);
      try {
        await deleteGalleryMedia(id);
        window.showToast("Đã xóa media", "success");
        await refreshGalleryTable(root);
      } catch (error) {
        window.showToast("Lỗi: " + error.message, "error");
      } finally {
        setLoading(saveBtn, false);
      }
    }
  };

  root.addEventListener("click", clickHandler);
  root._galleryManagerClickHandler = clickHandler;

  const saveHandler = async () => saveGalleryMedia();
  saveBtn?.addEventListener("click", saveHandler);
  cancelBtn?.addEventListener("click", () => modal?.classList.remove("active"));
  cancelTopBtn?.addEventListener("click", () => modal?.classList.remove("active"));
}