// services/admin/renderers/categories-manager.js
import { databases, DATABASE_ID } from '../../../shared/js/appwrite.js';

export async function renderCategoriesManager() {
    let categories = [];
    try {
        const res = await databases.listDocuments(DATABASE_ID, 'categories');
        categories = res.documents;
    } catch (err) {
        console.error('Error loading categories', err);
    }

    return `
        <div class="admin-table">
            <div class="table-header">
                <h3>📂 Quản lý danh mục món ăn</h3>
                <button id="openAddCategoryBtn" class="btn-primary">+ Thêm danh mục</button>
            </div>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên</th>
                            <th>Slug</th>
                            <th>Thứ tự</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categories.map(cat => `
                            <tr>
                                <td>${cat.name}</td>
                                <td>${cat.slug}如
                                <td>${cat.order ?? 0}</td>
                                <td>${cat.isActive ? '<span class="badge completed">Hiển thị</span>' : '<span class="badge pending">Ẩn</span>'}</span></td>
                                <td>
                                    <button class="action-btn edit-category" data-id="${cat.$id}">✏️</button>
                                    <button class="action-btn delete-category" data-id="${cat.$id}">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div id="categoryModal" class="modal">
            <div class="modal-content">
                <h3 id="categoryModalTitle">Thêm danh mục</h3>
                <input type="text" id="catName" placeholder="Tên danh mục" />
                <input type="text" id="catSlug" placeholder="Slug (ví dụ: com)" />
                <textarea id="catDesc" placeholder="Mô tả (không bắt buộc)"></textarea>
                <input type="number" id="catOrder" placeholder="Thứ tự" value="0" />
                <div>
                    <label>
                        <input type="checkbox" id="catActive" checked /> Hiển thị
                    </label>
                </div>
                <div class="modal-actions">
                    <button id="cancelCategory" class="btn-secondary">Hủy</button>
                    <button id="saveCategoryBtn" class="btn-primary">Lưu</button>
                </div>
            </div>
        </div>
    `;
}