// services/admin/renderers/menu-manager-templates.js
export function renderMenuManagerTemplate({
  totalCategories,
  visibleCategories,
  totalDishes,
  availableDishes,
  categoriesTableHtml,
  categoriesPaginationHtml,
  dishesTableHtml,
  dishesPaginationHtml,
  filterSelectHtml,  // 👈 nhận HTML select từ component
}) {
  return `
    <section class="menu-manager-shell">
      <div class="menu-manager-toolbar">
        <div class="menu-toolbar-copy">
          <h2>Quản lý menu</h2>
          <p>Theo dõi danh mục và món ăn trong hệ thống.</p>
        </div>
        <div class="menu-toolbar-stats">
            <div class="menu-toolbar-stat"><span class="menu-toolbar-label">Danh mục</span><strong>${totalCategories}</strong><span>${visibleCategories} hiển thị</span></div>
            <div class="menu-toolbar-stat"><span class="menu-toolbar-label">Món ăn</span><strong>${totalDishes}</strong><span>Tổng cộng</span></div>
          </div>
      </div>
      <div class="menu-grid">
        <section class="menu-panel">
          <div class="admin-section-header">
            <div><h3>Quản lý danh mục</h3><p class="section-note">Tạo, cập nhật và sắp xếp nhóm món ăn.</p></div>
            <button id="openAddCategoryBtn" class="btn-primary btn-icon-circle" type="button" title="Thêm danh mục"><i class="fas fa-plus"></i></button>
          </div>
          <div id="categoriesTableContainer" class="admin-table menu-table-card">
            ${categoriesTableHtml}
            ${categoriesPaginationHtml}
          </div>
        </section>
        <section class="menu-panel">
          <div class="admin-section-header">
            <div><h3>Quản lý món ăn</h3><p class="section-note">Cập nhật giá, danh mục và trạng thái phục vụ.</p></div>
            <div style="display: flex; gap: 8px; align-items: center;">
              ${filterSelectHtml}
              <button id="openAddDishBtn" class="btn-primary btn-icon-circle" type="button" title="Thêm món ăn"><i class="fas fa-plus"></i></button>
            </div>
          </div>
          <div id="dishesTableContainer" class="admin-table menu-table-card">
            ${dishesTableHtml}
            ${dishesPaginationHtml}
          </div>
        </section>
      </div>
    </section>
    <div id="menuModal" class="modal">
      <div class="modal-content modal-content-menu">
        <div class="modal-head">
          <div><h3 id="menuModalTitle">Thêm mới</h3><p class="section-note">Nhập thông tin và lưu thay đổi vào hệ thống.</p></div>
          <button id="cancelMenuModalTop" class="modal-close" type="button" title="Đóng"><i class="fas fa-times"></i></button>
        </div>
        <div id="menuModalBody" class="menu-modal-body"></div>
        <div class="modal-actions">
          <button id="cancelMenuModal" class="btn-secondary">Hủy</button>
          <button id="saveMenuModal" class="btn-primary">Lưu thay đổi</button>
        </div>
      </div>
    </div>
  `;
}