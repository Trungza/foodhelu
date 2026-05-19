// services/admin/features/employee-modal.js

import { renderEmployeeForm } from "../form/employess.js";

export function renderEmployeeModal() {
    return `
        <div id="employeeModal" class="modal">
            <div class="modal-content">
                <div class="modal-head">
                    <h3 id="employeeModalTitle">Nhân viên</h3>
                    <button id="closeEmployeeModal" class="modal-close">&times;</button>
                </div>
                <div id="employeeModalBody" class="menu-modal-body"></div>
                <div class="modal-actions">
                    <button id="cancelEmployee" class="btn-secondary">Hủy</button>
                    <button id="saveEmployee" class="btn-primary">Lưu</button>
                </div>
            </div>
        </div>
    `;
}

export function initEmployeeModalEvents(root) {
    const modal = root.querySelector("#employeeModal");
    const modalBody = modal?.querySelector("#employeeModalBody");
    const modalTitle = modal?.querySelector("#employeeModalTitle");
    let currentEmployeeId = null;

    function openModal(employee = null) {
        currentEmployeeId = employee?.id || null;
        modalTitle.innerText = employee ? "Sửa nhân viên" : "Thêm nhân viên mới";
        modalBody.innerHTML = renderEmployeeForm(employee);
        modal.classList.add("active");
    }

    root.querySelector("#openCreateEmployee")?.addEventListener("click", () => openModal());

    const closeModal = () => modal.classList.remove("active");
    root.querySelector("#cancelEmployee")?.addEventListener("click", closeModal);
    const closeTopBtn = modal?.querySelector("#closeEmployeeModal");
    if (closeTopBtn) closeTopBtn.addEventListener("click", closeModal);

    const saveBtn = modal?.querySelector("#saveEmployee");
    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const name = modalBody.querySelector("#empName")?.value.trim();
            const email = modalBody.querySelector("#empEmail")?.value.trim();
            const role = modalBody.querySelector("#empRole")?.value;
            const status = modalBody.querySelector("#empStatus")?.value;
            if (!name || !email) {
                alert("Vui lòng nhập đầy đủ tên và email");
                return;
            }
            console.log("Lưu nhân viên:", { id: currentEmployeeId, name, email, role, status });
            closeModal();
            // TODO: refresh employees table
        });
    }
}