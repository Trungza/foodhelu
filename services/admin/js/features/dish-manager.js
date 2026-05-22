﻿﻿﻿﻿﻿// services/admin/features/menu-manager-events.js
import {
  createCategory,
  createDish,
  deleteCategory,
  deleteDish,
  fetchAllCategories,
  getCategoryById,
  getDishById,
  getDishImageUrl,
  getDishesByCategory,
  updateCategory,
  updateDish,
  uploadDishImage,
} from "../data/menu-service.js";
import {
  renderCategoriesTable,
  renderDishesTable,
  loadCategories,
  loadDishes,
} from "../renderers/menu-manager.js";
import { renderInlineLoading } from "../../../shared/components/loading-component.js"; // thêm import
import { client, DATABASE_ID } from "../../../shared/js/appwrite.js";
import { APPWRITE_CONFIG, DB } from "../../../shared/js/config.js";
import { dishManageStyle } from "../style/dish-manager.js";
import { renderDishFormHTML } from "../form/dishes.js";
import { escapeHtml } from "../../../shared/js/utils.js";
import { showConfirmDialog } from "../../../shared/components/dialog.js"; // thêm import

let currentCategoryPage = 1;
let currentDishPage = 1;
let currentDishCategoryId = "";
const PAGE_SIZE = 5;

if (!document.querySelector("#admin-dish-manager-styles")) {
  const style = document.createElement("style");
  style.id = "admin-dish-manager-styles";
  style.textContent = dishManageStyle;
  document.head.appendChild(style);
}

// ========== LOADING ==========
function setTableLoading(
  containerId,
  loading,
  message = "Đang tải dữ liệu...",
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (loading) {
    const currentHeight = container.offsetHeight;
    if (currentHeight > 0) {
      container.style.minHeight = `${currentHeight}px`;
    }
    container.setAttribute("aria-busy", "true");
    let overlay = container.querySelector(".table-loading-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "table-loading-overlay";
      overlay.innerHTML = `<i class="fas fa-spinner"></i>`;
      container.appendChild(overlay);
    }
    overlay.classList.add("active");
    return;
  }
  container.removeAttribute("aria-busy");
  container.style.minHeight = "";
  const overlay = container.querySelector(".table-loading-overlay");
  if (overlay) overlay.classList.remove("active");
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


export async function refreshCategoryTable(root) {
    const container = root.querySelector("#categoriesTableContainer");
    if (!container) return;
    const table = container.querySelector("table");
    if (!table) return;
    const tbody = table.querySelector("tbody");
    const thead = table.querySelector("thead");
    if (!tbody || !thead) return;

    const colCount = thead.querySelectorAll("th").length;
    // Hiển thị loading trong tbody
    tbody.innerHTML = renderInlineLoading({ message: "Đang tải danh mục...", colspan: colCount });

    let total = 0;
    try {
        const result = await loadCategories(currentCategoryPage);
        const categories = result.documents;
        total = result.total;
        const totalPages = Math.ceil(total / PAGE_SIZE);

        // Lấy rows mới từ helper (cần có hàm renderCategoriesRows hoặc trích xuất)
        // Tạm thời dùng renderCategoriesTable và trích xuất tbody
        const newFullHtml = renderCategoriesTable(categories);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newFullHtml;
        const newTbody = tempDiv.querySelector('tbody');
        if (newTbody) {
            tbody.innerHTML = newTbody.innerHTML;
        } else {
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">Không có danh mục</td></tr>`;
        }

        // Cập nhật pagination
        const paginationDiv = container.querySelector(".pagination");
        const newPagination = renderPagination(currentCategoryPage, totalPages, 'category');
        if (paginationDiv) {
            paginationDiv.outerHTML = newPagination;
        } else {
            container.insertAdjacentHTML('beforeend', newPagination);
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">Lỗi tải dữ liệu</td></tr>`;
    } finally {
        // Cập nhật thống kê
        const allCategories = await fetchAllCategories();
        const visibleCategories = allCategories.filter(c => c.isActive !== false).length;
        const statsSpan = root.querySelector(".menu-toolbar-stat:first-child span:last-child");
        if (statsSpan) statsSpan.innerText = `${visibleCategories} hiển thị`;
        const totalSpan = root.querySelector(".menu-toolbar-stat:first-child strong");
        if (totalSpan) totalSpan.innerText = total;
    }
}

export async function refreshDishTable(root) {
    const container = root.querySelector("#dishesTableContainer");
    if (!container) return;
    const table = container.querySelector("table");
    if (!table) return;
    const tbody = table.querySelector("tbody");
    const thead = table.querySelector("thead");
    if (!tbody || !thead) return;

    const colCount = thead.querySelectorAll("th").length;
    tbody.innerHTML = renderInlineLoading({ message: "Đang tải món ăn...", colspan: colCount });

    try {
        const result = await loadDishes(currentDishPage, PAGE_SIZE, currentDishCategoryId);
        const dishes = result.documents;
        const total = result.total;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const allCategories = await fetchAllCategories();
        const categoriesMap = {};
        allCategories.forEach(cat => { categoriesMap[cat.$id] = cat.name; });

        const newFullHtml = renderDishesTable(dishes, categoriesMap, !!currentDishCategoryId);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newFullHtml;
        const newTbody = tempDiv.querySelector('tbody');
        if (newTbody) {
            tbody.innerHTML = newTbody.innerHTML;
        } else {
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">Không có món ăn</td></tr>`;
        }

        const paginationDiv = container.querySelector(".pagination");
        const newPagination = renderPagination(currentDishPage, totalPages, 'dish');
        if (paginationDiv) {
            paginationDiv.outerHTML = newPagination;
        } else {
            container.insertAdjacentHTML('beforeend', newPagination);
        }

        const totalSpan = root.querySelector(".menu-toolbar-stat:last-child strong");
        if (totalSpan) totalSpan.innerText = total;
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">Lỗi tải dữ liệu</td></tr>`;
    }
}

export function initMenuManagerEvents(root) {
  const modal = root.querySelector("#menuModal");
  const modalTitle = root.querySelector("#menuModalTitle");
  const modalBody = root.querySelector("#menuModalBody");
  const cancelBtn = root.querySelector("#cancelMenuModal");
  const cancelTopBtn = root.querySelector("#cancelMenuModalTop");
  const saveBtn = root.querySelector("#saveMenuModal");
  let currentCategoryId = null,
    currentDishId = null;
  let currentDishImageId = null;

  function setModalContent(html) {
    if (modalBody) modalBody.innerHTML = html;
  }
  function setLoading(isLoading) {
    if (!saveBtn) return;
    saveBtn.disabled = isLoading;
    saveBtn.innerHTML = isLoading
      ? '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...'
      : "Lưu thay đổi";
  }

  // ========== MENU MANAGER EVENTS ==========
  root
    .querySelector("#dishCategoryFilter")
    ?.addEventListener("change", async (e) => {
      const newCategoryId = e.target.value;
      currentDishCategoryId = newCategoryId;
      currentDishPage = 1;
      await refreshDishTable(root);
    });

  function cleanupDishPreviewUrl() {
    const previewImage = modalBody?.querySelector("#adminDishImagePreview");
    const objectUrl = previewImage?.dataset.objectUrl;
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    delete previewImage.dataset.objectUrl;
  }

  function updateDishPreview(file = null) {
    const previewImage = modalBody?.querySelector("#adminDishImagePreview");
    const placeholder = modalBody?.querySelector("#adminDishImagePlaceholder");
    const changeBadge = modalBody?.querySelector("#adminDishImageChangeBadge");
    const previewBox = modalBody?.querySelector("#adminDishImagePicker");
    if (!previewImage || !placeholder || !changeBadge || !previewBox) return;
    cleanupDishPreviewUrl();
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      previewImage.src = objectUrl;
      previewImage.dataset.objectUrl = objectUrl;
      previewImage.hidden = false;
      placeholder.hidden = true;
      changeBadge.hidden = false;
      previewBox.classList.add("has-image");
      return;
    }
    const existingSrc = previewImage.dataset.existingSrc || "";
    if (existingSrc) {
      previewImage.src = existingSrc;
      previewImage.hidden = false;
      placeholder.hidden = true;
      changeBadge.hidden = false;
      previewBox.classList.add("has-image");
      return;
    }
    previewImage.removeAttribute("src");
    previewImage.hidden = true;
    placeholder.hidden = false;
    changeBadge.hidden = true;
    previewBox.classList.remove("has-image");
  }

  // ===== CATEGORIES =====
  function renderCategoryForm(category = null) {
    setModalContent(`
      <div style="display: flex; flex-direction: column; gap: 12px;">
    <input type="text" id="catName" placeholder="Tên danh mục" value="${category?.name || ""}" 
           style="padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; font-size: 14px; outline: none; transition: 0.2s;" />
    <input type="number" id="catOrder" placeholder="Thứ tự" value="${category?.order || 0}" 
           style="padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; font-size: 14px; outline: none; transition: 0.2s;" />
     <label style="color: #0f172a;"><input type="checkbox" id="catActive" ${category?.isActive !== false ? "checked" : ""}> Hiển thị</label>
    <textarea id="catDesc" placeholder="Mô tả" 
              style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(148,163,184,0.2); background: rgba(255,255,255,0.96); color: #0f172a; font-size: 14px; outline: none; transition: 0.2s; min-height: 80px; resize: vertical;">${category?.description || ""}</textarea>
    
    
</div>
    `);
    modalBody?.querySelector("#catName")?.focus();
  }

  async function saveCategory() {
    const nameInput = modalBody?.querySelector("#catName");
    if (!nameInput) return showToast("Lỗi form", "error");
    const name = nameInput.value.trim();
    if (!name) return showToast("Tên danh mục không được để trống", "error");
    const description =
      modalBody?.querySelector("#catDesc")?.value.trim() || "";
    const order = parseInt(modalBody?.querySelector("#catOrder")?.value) || 0;
    const isActive = modalBody?.querySelector("#catActive")?.checked || false;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const data = {
      name,
      slug,
      description,
      order,
      isActive,
      updatedAt: new Date().toISOString(),
    };
    setLoading(true);
    try {
      if (currentCategoryId) {
        await updateCategory(currentCategoryId, data);
        showToast("Cập nhật danh mục thành công", "success");
      } else {
        await createCategory({ ...data, createdAt: new Date().toISOString() });
        showToast("Thêm danh mục thành công", "success");
      }
      modal.classList.remove("active");
      await refreshCategoryTable(root);
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function openCategoryModal(category = null) {
    cleanupDishPreviewUrl();
    currentCategoryId = category?.$id || null;
    currentDishId = null;
    currentDishImageId = null;
    modalTitle.innerText = category ? "Sửa danh mục" : "Thêm danh mục mới";
    renderCategoryForm(category);
    modal.classList.add("active");
  }

  function attachDishFormEvents() {
    const catSelect = modalBody?.querySelector("#adminDishCategory");
    const imageInput = modalBody?.querySelector("#adminDishImage");
    const imagePicker = modalBody?.querySelector("#adminDishImagePicker");
    if (catSelect) {
      catSelect.addEventListener("change", () => {
        const slug =
          catSelect.options[catSelect.selectedIndex]?.getAttribute("data-slug");
        if (slug && modalBody) modalBody.dataset.categorySlug = slug;
      });
    }

    if (imagePicker && imageInput) {
      imagePicker.addEventListener("click", () => imageInput.click());
      imageInput.addEventListener("change", () => {
        const selectedFile = imageInput.files?.[0] || null;
        updateDishPreview(selectedFile);
      });
    }
    updateDishPreview(null);
  }

  // ===== DISHES =====
  async function renderDishForm(dish = null) {
    try {
      const cats = await fetchAllCategories();
      const existingImageUrl = dish?.imageId
        ? getDishImageUrl(dish.imageId, APPWRITE_CONFIG.PROJECT_ID)
        : "";
      const html = renderDishFormHTML(dish, cats, existingImageUrl);
      setModalContent(html);
      attachDishFormEvents();
    } catch (err) {
      console.log(err.message);

      showToast("Lỗi tải danh mục: " + err.message, "error");
    }
  }

  async function openDishModal(dish = null) {
    cleanupDishPreviewUrl();
    currentDishId = dish?.$id || null;
    currentCategoryId = null;
    currentDishImageId = dish?.imageId || null;
    modalTitle.innerText = dish ? "Sửa món ăn" : "Thêm món ăn mới";
    await renderDishForm(dish); // 👈 await để form được render trước khi mở modal
    modal.classList.add("active");
  }

  async function saveDish() {
    const nameInput = modalBody?.querySelector("#adminDishName");
    const priceInput = modalBody?.querySelector("#adminDishPrice");
    const catSelect = modalBody?.querySelector("#adminDishCategory");
    const description =
      modalBody?.querySelector("#adminDishDesc")?.value.trim() || "";
    const isAvailable =
      modalBody?.querySelector("#adminDishAvailable")?.checked ?? true;
    const imageFile = modalBody?.querySelector("#adminDishImage")?.files[0];
    if (!nameInput || !priceInput || !catSelect)
      return showToast("Lỗi form", "error");
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const categoryId = catSelect.value;
    if (!name || !Number.isFinite(price) || price <= 0 || !categoryId)
      return showToast("Thiếu thông tin bắt buộc", "error");
    const categorySlug =
      catSelect.options[catSelect.selectedIndex]?.getAttribute("data-slug");
    
   
    let imageId = currentDishImageId;
    if (imageFile) {
      try {
        const upload = await uploadDishImage(imageFile);
        imageId = upload.$id;
        currentDishImageId = upload.$id;
      } catch (err) {
        return showToast("Lỗi upload ảnh: " + err.message, "error");
      }
    }
    const data = {
      name,
      price,
      categoryId,
      categorySlug: categorySlug || categoryId,
      isAvailable
    };
    if (description) data.description = description;
    if (imageId) data.imageId = imageId;
    setLoading(true);
    try {
      if (currentDishId) {
        data.updatedAt = new Date().toISOString();
        await updateDish(currentDishId, data);
        showToast("Cập nhật món thành công", "success");
      } else {
        const nowIso = new Date().toISOString();
        data.createdAt = nowIso;
        data.updatedAt = nowIso;
        await createDish(data);
        showToast("Thêm món thành công", "success");
      }
      cleanupDishPreviewUrl();
      modal.classList.remove("active");
      await refreshDishTable(root);
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // ===== SỰ KIỆN PHÂN TRANG =====
  if (root._menuManagerClickHandler) {
    root.removeEventListener("click", root._menuManagerClickHandler);
  }
  const clickHandler = async (e) => {
    const addCategory = e.target.closest("#openAddCategoryBtn");
    if (addCategory) {
      openCategoryModal();
      return;
    }
    const addDish = e.target.closest("#openAddDishBtn");
    if (addDish) {
      await openDishModal();
      return;
    }
    const pageBtn = e.target.closest(".pagination-btn");
    if (pageBtn) {
      const type = pageBtn.dataset.type;
      const page = parseInt(pageBtn.dataset.page);
      if (type === "category") {
        currentCategoryPage = page;
        await refreshCategoryTable(root);
      } else if (type === "dish") {
        currentDishPage = page;
        await refreshDishTable(root);
      }
      return;
    }
    // Sửa danh mục
    const editCat = e.target.closest(".edit-category");
    if (editCat) {
      try {
        const cat = await getCategoryById(editCat.getAttribute("data-id"));
        openCategoryModal(cat);
      } catch {
        showToast("Lỗi tải danh mục", "error");
      }
      return;
    }
    // Xóa danh mục
    const delCat = e.target.closest(".delete-category");
    if (delCat) {
      const id = delCat.getAttribute("data-id");
      let categoryName = "danh mục này";
      let dishesInCategory = [];
      try {
        const [categoryDoc, dishDocs] = await Promise.all([
          getCategoryById(id),
          getDishesByCategory(id),
        ]);
        categoryName = categoryDoc?.name || categoryName;
        dishesInCategory = dishDocs;
      } catch (err) {
        showToast(
          "Không tải được dữ liệu để xác nhận xóa: " + err.message,
          "error",
        );
        return;
      }
      const dishItemsHtml = dishesInCategory.length
        ? `<div style="margin-top:8px"><strong>Các món sẽ bị xóa (${dishesInCategory.length}):</strong><ul style="margin:8px 0 0 18px; max-height:200px; overflow:auto;">${dishesInCategory.map((d) => `<li>${escapeHtml(d.name || d.$id)}</li>`).join("")}</ul></div>`
        : '<div style="margin-top:8px;color:#475569">Không có món nào thuộc danh mục này.</div>';
      const accepted = await showConfirmDialog({
        title: "Xác nhận xóa danh mục",
        message: `Bạn có muốn xóa danh mục "${escapeHtml(categoryName)}" không?`,
        detailsHtml: dishItemsHtml,
        confirmText: "Xóa danh mục",
      });
      if (!accepted) return;
      setLoading(true);
      try {
        await Promise.all(dishesInCategory.map((dish) => deleteDish(dish.$id)));
        await deleteCategory(id);
        showToast(
          `Đã xóa danh mục và ${dishesInCategory.length} món liên quan`,
          "success",
        );
        await Promise.all([refreshCategoryTable(root), refreshDishTable(root)]);
      } catch (err) {
        showToast("Lỗi: " + err.message, "error");
      } finally {
        setLoading(false);
      }
      return;
    }
    // Sửa món ăn
    const editDish = e.target.closest(".edit-dish");
    if (editDish) {
      try {
        const dish = await getDishById(editDish.getAttribute("data-id"));
        await openDishModal(dish);
      } catch {
        showToast("Lỗi tải món ăn", "error");
      }
      return;
    }
    // Xóa món ăn
    const delDish = e.target.closest(".delete-dish");
    if (delDish) {
      const id = delDish.getAttribute("data-id");
      const accepted = await showConfirmDialog({
        title: "Xác nhận xóa món ăn",
        message: "Bạn có muốn xóa món ăn này không?",
        confirmText: "Xóa món",
      });
      if (!accepted) return;
      setLoading(true);
      try {
        await deleteDish(id);
        showToast("Đã xóa món ăn", "success");
        await refreshDishTable(root);
      } catch (err) {
        showToast("Lỗi: " + err.message, "error");
      } finally {
        setLoading(false);
      }
      return;
    }
  };
  root.addEventListener("click", clickHandler);
  root._menuManagerClickHandler = clickHandler;

  const closeModal = () => {
    cleanupDishPreviewUrl();
    modal?.classList.remove("active");
  };
  cancelBtn?.addEventListener("click", closeModal);
  cancelTopBtn?.addEventListener("click", closeModal);
  saveBtn?.addEventListener("click", () => {
    if (
      currentCategoryId !== null ||
      (modalTitle?.innerText.includes("danh mục") && currentDishId === null)
    )
      saveCategory();
    else saveDish();
  });
}
