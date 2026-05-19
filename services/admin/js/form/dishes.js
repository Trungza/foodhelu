// services/admin/form/dishes.js
import { escapeHtml } from "../../../shared/js/utils.js";

// Inject CSS cho dish form (chỉ một lần)
(function injectDishFormStyles() {
  if (document.getElementById("dish-form-styles")) return;
  const style = document.createElement("style");
  style.id = "dish-form-styles";
  style.textContent = `
    // Thêm vào trong dishManageStyle
.admin-dish-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.admin-dish-span-2 {
  grid-column: span 2;
}
.admin-dish-image-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.admin-dish-image-preview-title {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}
.admin-dish-image-preview-box {
  position: relative;
  width: 100%;
  height: 160px;
  border: 1px dashed var(--border, rgba(255,255,255,0.2));
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}
.admin-dish-image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.admin-dish-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #334155;
}
.admin-dish-image-change-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(255,255,255,0.96);
  border-radius: 20px;
  padding: 4px 8px;
  font-size: 12px;
  color: #0f172a;
}
.admin-dish-available-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
  .admin-dish-form-grid{
  display:block
  }
  .admin-dish-form-grid input,.admin-dish-form-grid select{
  display:inline-block;
  width:32%;
  }
  .admin-dish-form-grid textarea{
  width:100%;
  margin-top:20px
  }
  `;
  document.head.appendChild(style);
})();

export function renderDishFormHTML(
  dish = null,
  categories = [],
  existingImageUrl = "",
) {
  const catOptions = categories
    .map(
      (cat) =>
        `<option value="${cat.$id}" data-slug="${cat.slug}" ${dish?.categoryId === cat.$id ? "selected" : ""}>${escapeHtml(cat.name)}</option>`,
    )
    .join("");

  return `
    <div class="admin-dish-form-grid">
      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <input class="admin-dish-span-2" type="text" id="adminDishName" placeholder="Tên món" value="${dish?.name || ""}" style="flex:2" />
        <input type="number" id="adminDishPrice" placeholder="Giá bán" value="${dish?.price || ""}" style="flex:1" />
        <select id="adminDishCategory" style="flex:1.5">${catOptions}</select>
      </div>
      <textarea class="admin-dish-span-2" id="adminDishDesc" placeholder="Mô tả" rows="3">${dish?.description || ""}</textarea>
      <div class="admin-dish-image-preview-wrap admin-dish-span-2">
        <span class="admin-dish-image-preview-title">Ảnh món ăn</span>
        <input type="file" id="adminDishImage" accept="image/*" hidden style="display:none" />
        <button type="button" id="adminDishImagePicker" class="admin-dish-image-preview-box">
          <img id="adminDishImagePreview" class="admin-dish-image-preview" data-existing-src="${existingImageUrl}" alt="Dish preview" ${existingImageUrl ? `src="${existingImageUrl}"` : ""} ${existingImageUrl ? "" : "hidden"} />
          <span id="adminDishImagePlaceholder" class="admin-dish-image-placeholder" ${existingImageUrl ? "hidden" : ""}>
            <i class="fas fa-cloud-upload-alt"></i>
            <span>Tải ảnh lên</span>
          </span>
          <span id="adminDishImageChangeBadge" class="admin-dish-image-change-badge" ${existingImageUrl ? "" : "hidden"}>
            <i class="fas fa-pen"></i>
          </span>
        </button>
      </div>
    </div>
  `;
}