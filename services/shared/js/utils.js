export function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
  );
}

export function getStatusText(status) {
    const map = {
        pending: "Chờ xử lý",
        confirmed: "Chờ nấu",
        processing:"Đang nấu",
        completed: "Hoàn thành",
        cancelled: "Đã hủy"
    };
    return map[status] || status;
}

export const STATUS = {
    STEP_1:'pending',
    STEP_2:'confirmed',
    STEP_3:'processing',
    STEP_4:'completed',
    CENCELLED:'cancelled',
}