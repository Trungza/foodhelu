import { getCurrentUser, logoutCurrentSession, userHasRole } from "../../shared/js/auth-service.js";
import { RBAC } from "../../shared/js/config.js";
import { redirectToGateway } from "./core/route.js";
import { renderDashboard } from "./views/dashboard-view.js";

const ALLOWED_ROLES = [RBAC.ROLES.ADMIN];

async function bootstrap() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            redirectToGateway("Vui lòng đăng nhập");
            return;
        }

        if (!(await userHasRole(user, ALLOWED_ROLES))) {
            redirectToGateway("Không có quyền truy cập");
            return;
        }

        await renderDashboard(user);

        document.getElementById("logoutBtn")?.addEventListener("click", async () => {
            await logoutCurrentSession();
            redirectToGateway();
        });
    } catch (error) {
        console.error("Khởi tạo trang admin thất bại:", error);
        const app = document.getElementById("app");
        if (app) {
            app.innerHTML = `
                <section class="dashboard-shell" style="padding: 24px;">
                    <div class="empty-state">Không thể khởi tạo trang quản trị. Vui lòng kiểm tra kết nối mạng/Appwrite và tải lại trang.</div>
                </section>
            `;
        }
    }
}

bootstrap();
