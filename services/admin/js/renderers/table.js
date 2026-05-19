// shared/js/render-utils.js
import { renderInlineLoading } from "../../../shared/components/loading-component.js";
import { escapeHtml } from "../../../shared/js/utils.js";

function renderPagination(currentPage, totalPages, type) {
  if (totalPages <= 1) return "";
  let html = `<div class="pagination" data-type="${type}">`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}" data-type="${type}">${i}</button>`;
  }
  html += `</div>`;
  return html;
}

export function renderDataTable({
  tableClass = "",
  colgroup = "",
  headers = [],
  rows = "",
  emptyMessage = "Chưa có dữ liệu.",
  loading = false,
  loadingMessage = "Đang tải dữ liệu...",
  pagination = null, // { currentPage, totalPages, type }
} = {}) {
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
  const colCount = headers.length;

  let content = "";
  
  if (loading) {
    const inlineLoading = renderInlineLoading({
      message: loadingMessage,
      colspan: colCount,
      containerTag: "td",
    });
    content = `
      <div class="table-wrapper">
        <table class="${tableClass}">
          ${colgroup ? `<colgroup>${colgroup}</colgroup>` : ""}
          <thead><tr>${headerHtml}</thead>
          <tbody>${inlineLoading}</tbody>
        </table>
      </div>
    `;
  } else {
    const hasRows = typeof rows === "string" && rows.trim().length > 0;
    let tbodyContent = '';
    if (!hasRows) {
      tbodyContent = `<tr><td colspan="${colCount}" style="text-align: center; padding: 40px;">${escapeHtml(emptyMessage)}</td></tr>`;
    } else {
      tbodyContent = rows;
    }
    content = `
      <div class="table-wrapper">
        <table class="${tableClass}">
          ${colgroup ? `<colgroup>${colgroup}</colgroup>` : ""}
          <thead><tr>${headerHtml}</thead>
          <tbody>${tbodyContent}</tbody>
        </table>
      </div>
    `;
  }

  // Thêm pagination nếu có
  if (pagination && pagination.totalPages > 1) {
    const paginationHtml = renderPagination(pagination.currentPage, pagination.totalPages, pagination.type);
    content += paginationHtml;
  }

  return content;
}