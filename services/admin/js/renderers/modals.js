export function renderEmployeeModal() {
    return `
        <div class="modal" id="employeeModal">
            <div class="modal-content">
                <h3>Tạo nhân viên mới</h3>
                <input type="text" id="empName" placeholder="Tên nhân viên" />
                <input type="email" id="empEmail" placeholder="Email" />
                <select id="empRole">
                    <option value="kitchen">Bếp</option>
                    <option value="admin">Admin</option>
                </select>
                <select id="empStatus">
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Khóa</option>
                </select>
                <div class="modal-actions">
                    <button id="cancelEmployee" class="btn-secondary">Hủy</button>
                    <button id="saveEmployee" class="btn-primary">Lưu</button>
                </div>
            </div>
        </div>
    `;
}

export function renderOrderModal() {
    return `
        <div id="orderModal" class="modal">
            <div class="modal-content modal-content-wide" style="border-radius: 1.5rem; overflow: hidden; padding: 0; border: none; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                <div class="modal-header" style="background: #f8fafc; padding: 1.5rem 2rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #1e293b; font-size: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fas fa-receipt" style="color: #4f46e5;"></i> Chi tiết đơn hàng
                    </h3>
                </div>
                <div id="orderDetailContent" style="padding: 2rem; max-height: 70vh; overflow-y: auto;"></div>
                <div class="modal-actions">
                    <button id="closeOrderModal" class="btn-secondary" style="border-radius: 0.75rem; font-weight: 600;">Đóng cửa sổ</button>
                </div>
            </div>
        </div>
    `;
}

export function renderAddDishModal() {
    return `
        <div id="addDishModal" class="modal">
            <div class="modal-content">
                <h3>➕ Thêm món ăn mới</h3>
                <input type="text" id="dishName" placeholder="Tên món" />
                <textarea id="dishDesc" placeholder="Mô tả" rows="2"></textarea>
                <input type="number" id="dishPrice" placeholder="Giá bán (VNĐ)" />
                <select id="dishCategory">
                    <option value="com">Cơm</option>
                    <option value="bun">Bún</option>
                    <option value="banhmy">Bánh mỳ</option>
                    <option value="nuoc">Nước</option>
                    <option value="trammieng">Tráng miệng</option>
                </select>
                <input type="file" id="dishImage" accept="image/*" />
                <div class="modal-actions">
                    <button id="cancelAddDish" class="btn-secondary">Hủy</button>
                    <button id="saveDishBtn" class="btn-primary">Lưu</button>
                </div>
            </div>
        </div>
    `;
}