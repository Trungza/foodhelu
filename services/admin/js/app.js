import { getCurrentUser, logoutCurrentSession, userHasRole } from "../../shared/js/auth-service.js";
import { RBAC } from "../../shared/js/config.js";
import { redirectToGateway } from "./core/route.js";
import { renderDashboard } from "./views/dashboard-view.js";

const LOADER_START_TIME = Date.now();
const MINIMUM_LOADER_DURATION = 800;

const ALLOWED_ROLES = [RBAC.ROLES.ADMIN];

// --- Page Loader Logic ---
function createAndInjectPageLoader() {
  if (document.getElementById('page-loader')) return;

  const loaderHtml = `
        <div id="page-loader" class="page-loader">
            <div class="loader-wrapper">
                <div class="loader-spinner"></div>
                <img src="../customer/img/logo.png" class="loader-logo" alt="Logo" onerror="this.style.display='none'">
            </div>
        </div>
    `;
  
  if (document.body) {
    document.body.insertAdjacentHTML('afterbegin', loaderHtml);
  }

  const style = document.createElement('style');
  style.textContent = `
        .page-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #ffffff; /* Nền trắng */
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            opacity: 1;
            visibility: visible;
            transform: scale(1);
            transition: opacity 0.5s ease, visibility 0.5s ease, transform 0.5s ease;
            animation: loader-scale-in 0.5s ease-out forwards;
        }

        .page-loader.hidden {
            opacity: 0;
            visibility: hidden;
            transform: scale(1.1);
        }

        .loader-wrapper {
            position: relative;
            width: 80px;
            height: 80px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .loader-logo {
            position: absolute;
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 50%;
            z-index: 1;
            animation: logo-pulse 2s ease-in-out infinite;
        }

        .loader-spinner {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 3px solid rgba(0, 0, 0, 0.05);
            border-top: 3px solid #2563eb; /* Màu xanh dương cho Admin */
            border-radius: 50%;
            animation: spin-loader 1s linear infinite;
        }

        @keyframes loader-scale-in {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        @keyframes spin-loader {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes logo-pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
        }
    `;
  document.head.appendChild(style);
}

function hidePageLoader() {
  const currentTime = Date.now();
  const timeElapsed = currentTime - LOADER_START_TIME;
  const remainingTime = Math.max(0, MINIMUM_LOADER_DURATION - timeElapsed);

  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('hidden');
      loader.addEventListener('transitionend', () => loader.remove());
    }
  }, remainingTime);
}

createAndInjectPageLoader();

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
    } finally {
        // Luôn ẩn loader dù có lỗi hay không
        hidePageLoader();
    }
}

bootstrap();
