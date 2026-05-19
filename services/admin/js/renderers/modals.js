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
            <div class="modal-content modal-content-wide">
                <h3>📦 Chi tiết đơn hàng</h3>
                <div id="orderDetailContent"></div>
                <div class="modal-actions">
                    <button id="closeOrderModal" class="btn-secondary">Đóng</button>
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