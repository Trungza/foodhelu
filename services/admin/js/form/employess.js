// services/admin/renderers/employee-form.js
import { escapeHtml } from "../../../shared/js/utils.js";

export function renderEmployeeForm(employee = null) {
    return `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <input type="text" id="empName" placeholder="Tên nhân viên" value="${escapeHtml(employee?.name || '')}" 
                   style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #f8fafc; font-size: 14px;" />
            <input type="email" id="empEmail" placeholder="Email" value="${escapeHtml(employee?.email || '')}" 
                   style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #f8fafc; font-size: 14px;" />
            <select id="empRole" style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #f8fafc; font-size: 14px;">
                <option value="kitchen" ${employee?.role === 'kitchen' ? 'selected' : ''}>Bếp</option>
                <option value="admin" ${employee?.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <select id="empStatus" style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #f8fafc; font-size: 14px;">
                <option value="active" ${employee?.status === 'active' ? 'selected' : ''}>Hoạt động</option>
                <option value="inactive" ${employee?.status === 'inactive' ? 'selected' : ''}>Khóa</option>
            </select>
        </div>
    `;
}