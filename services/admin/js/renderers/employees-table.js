// services/admin/renderers/employees-table.js
import { escapeHtml } from "../../../shared/js/utils.js";
import { mockEmployees } from "../data/mock-data.js";
import { renderDataTable } from "./table.js";

export function renderEmployeesTable() {
    const rows = mockEmployees.map(employee => `
        <tr>
            <td>${escapeHtml(employee.name)}</td
            <td>${escapeHtml(employee.email)}</td
            <td>${employee.status === 'active' ? 'Hoạt động' : 'Khóa'}</td
        </tr>
    `).join("");

    return `
        <div class="admin-table">
            <div class="table-header">
                <h3>Nhân viên</h3>
                <button id="openCreateEmployee" class="btn-primary btn-icon-circle" type="button" title="Thêm nhân viên" aria-label="Thêm nhân viên"><i class="fas fa-plus"></i></button>
            </div>
            ${renderDataTable({
                tableClass: "data-table",
                headers: ["Tên", "Email", "Trạng thái"],
                rows,
                emptyMessage: "Chưa có nhân viên."
            })}
        </div>
    `;
}
