// services/admin/features/category-manager.js
import { databases, DATABASE_ID, ID } from '../../../shared/js/appwrite.js';

export function initCategoryManagerEvents(app) {
    const addBtn = app.querySelector('#openAddCategoryBtn');
    const modal = app.querySelector('#categoryModal');
    if (!addBtn || !modal) return;

    const closeModal = () => modal.classList.remove('active');
    const openModal = (category = null) => {
        const isEdit = !!category;
        document.getElementById('categoryModalTitle').innerText = isEdit ? 'Sửa danh mục' : 'Thêm danh mục';
        document.getElementById('catName').value = category?.name || '';
        // document.getElementById('catSlug').value = category?.slug || '';
        document.getElementById('catDesc').value = category?.description || '';
        // document.getElementById('catOrder').value = category?.order ?? 0;
        document.getElementById('catActive').checked = category?.isActive ?? true;
        modal.dataset.editId = isEdit ? category.$id : '';
        modal.classList.add('active');
    };

    addBtn.addEventListener('click', () => openModal());

    app.querySelector('#cancelCategory')?.addEventListener('click', closeModal);

    app.querySelector('#saveCategoryBtn')?.addEventListener('click', async () => {
        const name = document.getElementById('catName').value.trim();
        const slug = document.getElementById('catSlug').value.trim();
        const description = document.getElementById('catDesc').value.trim();
        const order = parseInt(document.getElementById('catOrder').value) || 0;
        const isActive = document.getElementById('catActive').checked;
        const editId = modal.dataset.editId;

        if (!name) {
            alert('Vui lòng nhập tên danh mục');
            return;
        }

        const data = {
            name,
            slug: slug || name.toLowerCase().replace(/ /g, '_'),
            description,
            order,
            isActive
        };

        try {
            if (editId) {
                await databases.updateDocument(DATABASE_ID, 'categories', editId, data);
                alert('Cập nhật danh mục thành công');
            } else {
                await databases.createDocument(DATABASE_ID, 'categories', ID.unique(), data);
                alert('Thêm danh mục thành công');
            }
            closeModal();
            // Reload lại tab (có thể trigger event hoặc reload trang)
            window.dispatchEvent(new Event('refresh-categories'));
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    });

    // Xóa
    app.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            if (confirm('Xóa danh mục sẽ ảnh hưởng đến các món ăn. Bạn chắc chắn?')) {
                try {
                    await databases.deleteDocument(DATABASE_ID, 'categories', id);
                    alert('Đã xóa');
                    window.dispatchEvent(new Event('refresh-categories'));
                } catch (err) {
                    alert('Lỗi: ' + err.message);
                }
            }
        });
    });

    // Sửa (mở modal với dữ liệu)
    app.querySelectorAll('.edit-category').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            try {
                const cat = await databases.getDocument(DATABASE_ID, 'categories', id);
                openModal(cat);
            } catch (err) {
                alert('Không thể tải dữ liệu');
            }
        });
    });
}
