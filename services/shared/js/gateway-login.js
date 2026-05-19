import {
    getCurrentUser,
    getFriendlyError,
    getUserRoles,
    loginWithEmail,
    logoutCurrentSession
} from "./auth-service.js";
import { RBAC } from "./config.js";

const form = document.getElementById("staffLoginForm");
const errorBox = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const initialError = new URLSearchParams(window.location.search).get("error") || "";

function setError(message = "") {
    if (errorBox) errorBox.textContent = message;
}

function setLoading(loading) {
    if (!loginButton) return;
    loginButton.disabled = loading;
    loginButton.textContent = loading ? "Đang đăng nhập..." : "Đăng nhập và chuyển trang";
}

async function resolveServicePath(user) {
    const roles = await getUserRoles(user);
    
    // chuẩn hoá
    const safeRoles = Array.isArray(roles) ? roles : [];
        
    if (safeRoles.includes(RBAC.ROLES.ADMIN)) return "./services/admin/index.html";
    if (safeRoles.includes(RBAC.ROLES.KITCHEN)) return "./services/kitchen/index.html";
    return "";
}

async function redirectByRole() {
    const user = await getCurrentUser();
    
    if (!user) return;
    
    const target =await resolveServicePath(user);
    
    if (target) {
        window.location.href = target;
        return;
    }

    await logoutCurrentSession();
    setError("Tài khoản không có role hợp lệ để vào hệ thống.");
}

async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
        await loginWithEmail(email, password);
        await redirectByRole();
    } catch (error) {
        setError(getFriendlyError(error));
    } finally {
        setLoading(false);
    }
}

form?.addEventListener("submit", handleLogin);

if (initialError) {
    setError(initialError);
}

// chỉ check session, không auto redirect gây loop
redirectByRole();