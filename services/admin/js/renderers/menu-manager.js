﻿// services/admin/renderers/menu-manager.js
import {
  fetchAllCategories,
  fetchCategories,
  fetchDishes,
  getDishImageUrl,
} from "../data/menu-service.js";
import { renderDataTable } from "./table.js";
import { APPWRITE_CONFIG } from "../../../shared/js/config.js";
import { escapeHtml } from "../../../shared/js/utils.js";
import { renderMenuManagerTemplate } from "../form/menu-manager-templates.js";
import { renderSelect } from "../../../shared/components/select-component.js";

const CATEGORY_PAGE_LIMIT = 5;
const DISH_PAGE_LIMIT = 5;

export async function loadCategories(page = 1, limit = CATEGORY_PAGE_LIMIT) {
  try {
    return await fetchCategories(page, limit);
  } catch (error) {
    console.error("Lỗi tải danh mục:", error);
    return { documents: [], total: 0 };
  }
}

export async function loadDishes(page = 1, limit = DISH_PAGE_LIMIT, categoryId = "") {
  try {
    return await fetchDishes(page, limit, categoryId);
  } catch (error) {
    console.error("Lỗi tải món ăn:", error);
    return { documents: [], total: 0 };
  }
}

export async function loadAllCategories() {
  try {
    return await fetchAllCategories();
  } catch (error) {
    console.error("Lỗi tải toàn bộ danh mục:", error);
    return [];
  }
}

function getSafeImageTag(imageId, dishName) {
  if (!imageId) return '<span class="no-image">—</span>';
  const url = getDishImageUrl(imageId, APPWRITE_CONFIG.PROJECT_ID);
  return `<img src="${url}" alt="${escapeHtml(dishName)}" class="dish-thumbnail" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\' viewBox=\'0 0 24 24\' fill=\'%23ccc\'%3E%3Cpath d=\'M4 4h16v16H4z\'/%3E%3C/svg%3E'; this.style.opacity='0.6';" />`;
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

export function renderCategoriesTable(categories) {
  const rows = categories
    .map(
      (category) => `
        <tr data-id="${category.$id}">
          <td><div class="entity-cell"><strong>${escapeHtml(category.name)}</strong><span>${escapeHtml(category.description || "Danh mục chưa có mô tả.")}</span></div></td>
          <td><span class="order-pill">${category.order ?? 0}</span></td>
          <td><div class="action-group"><button type="button" class="action-btn icon-btn edit-category" data-id="${category.$id}" title="Sửa danh mục"><i class="fas fa-pen"></i></button><button type="button" class="action-btn icon-btn delete delete-category" data-id="${category.$id}" title="Xóa danh mục"><i class="fas fa-trash"></i></button></div></td>
        </tr>
      `,
    )
    .join("");

  return renderDataTable({
    tableClass: "data-table stable-cols category-cols",
    colgroup: `<col class="col-name" /><col class="col-order" /><col class="col-actions" />`,
    headers: ["Tên", "Thứ tự", "Thao tác"],
    rows,
    emptyMessage: "Chưa có danh mục nào. Hãy thêm mới.",
  });
}

export function renderDishesTable(dishes, categoriesMap = {}, isFiltered = false) {
  const rows = dishes
    .map((dish) => {
      const categoryDisplay =
        dish.categoryName ||
        categoriesMap[dish.categoryId] ||
        dish.categorySlug ||
        dish.categoryId ||
        "Chưa phân loại";
      return `
        <tr data-id="${dish.$id}">
          <td class="dish-image-cell">${getSafeImageTag(dish.imageId, dish.name)}</td>
          <td><div class="entity-cell"><strong>${escapeHtml(dish.name)}</strong><span>${escapeHtml(dish.description || "Món ăn chưa có mô tả.")}</span></div></td>
          <td><span class="category-pill">${escapeHtml(categoryDisplay)}</span></td>
          <td><strong class="price-text">${dish.price.toLocaleString("vi-VN")}đ</strong></td>
          <td><div class="action-group"><button type="button" class="action-btn icon-btn edit-dish" data-id="${dish.$id}" title="Sửa món ăn"><i class="fas fa-pen"></i></button><button type="button" class="action-btn icon-btn delete delete-dish" data-id="${dish.$id}" title="Xóa món ăn"><i class="fas fa-trash"></i></button></div></td>
        </tr>
      `;
    })
    .join("");

  return renderDataTable({
    tableClass: "data-table stable-cols dish-cols",
    colgroup: `<col class="col-image" /><col class="col-name" /><col class="col-category" /><col class="col-price" /><col class="col-actions" />`,
    headers: ["Ảnh", "Tên món", "Danh mục", "Giá bán", "Thao tác"],
    rows,
    emptyMessage: isFiltered
      ? "Không tìm thấy món ăn nào trong danh mục này."
      : "Chưa có món ăn nào trong thực đơn. Hãy thêm mới món đầu tiên.",
  });
}

export async function renderMenuManager(categoryPage = 1, dishPage = 1, categoryId = "") {
  const [categoriesResult, dishesResult, allCategories] = await Promise.all([
    loadCategories(categoryPage),
    loadDishes(dishPage, DISH_PAGE_LIMIT, categoryId),
    loadAllCategories(),
  ]);

  const categories = categoriesResult.documents;
  const dishes = dishesResult.documents;
  const totalCategories = categoriesResult.total;
  const totalDishes = dishesResult.total;

  const categoriesMap = {};
  allCategories.forEach((cat) => {
    categoriesMap[cat.$id] = cat.name;
  });

  const visibleCategories = allCategories.filter((c) => c.isActive !== false).length;
  const totalCategoryPages = Math.ceil(totalCategories / CATEGORY_PAGE_LIMIT);
  const totalDishPages = Math.ceil(totalDishes / DISH_PAGE_LIMIT);

  const sortedCategories = [...allCategories].sort((a, b) => {
    const orderDiff = (a.order || 0) - (b.order || 0);
    return orderDiff !== 0 ? orderDiff : (a.name || "").localeCompare(b.name || "");
  });

  // Dùng component renderSelect để tạo select filter
  const filterSelectHtml = renderSelect({
    id: "dishCategoryFilter",
    className: "dish-category-filter",
    options: [
      { value: "", label: "Tất cả danh mục" },
      ...sortedCategories.map(cat => ({ value: cat.$id, label: cat.name }))
    ],
    selectedValue: categoryId,
    includeEmptyOption: false // đã có option "Tất cả" ở trên
  });

  const categoriesTableHtml = renderCategoriesTable(categories);
  const categoriesPaginationHtml = renderPagination(categoryPage, totalCategoryPages, "category");
  const dishesTableHtml = renderDishesTable(dishes, categoriesMap, !!categoryId);
  const dishesPaginationHtml = renderPagination(dishPage, totalDishPages, "dish");
  return renderMenuManagerTemplate({
    totalCategories,
    visibleCategories,
    totalDishes,
    categoriesTableHtml,
    categoriesPaginationHtml,
    dishesTableHtml,
    dishesPaginationHtml,
    filterSelectHtml,
  });
}