import { account, databases, Query } from "./appwrite.js";
import { DB, RBAC } from "./config.js";

export async function getCurrentUser() {
    try {
        return await account.get();
    } catch (error) {
        console.error("Lỗi lấy thông tin user:", error);
        if (error?.code === 401) return null;
        return null;
    }
}

export async function loginWithEmail(email, password) {
    try {
        // 🔥 Quan trọng: xoá session cũ trước để tránh lỗi "session active"
        await account.deleteSession("current");
    } catch (e) {
        // không có session thì bỏ qua
    }

    // tạo session mới (CHỈ 1 LẦN)
    return await account.createEmailPasswordSession(email, password);
}

export async function logoutCurrentSession() {
    try {
        await account.deleteSession("current");
    } catch (error) {
        if (error?.code !== 401) {
            console.error(error);
        }
    }
}

export async function getUserRoles(user) {
   
    try {
        const res = await databases.listDocuments(
            DB.DATABASE_ID,
            DB.COLLECTIONS.USERS,
            [
                Query.equal("userId", user.$id)
            ]
        );


        const profile = res.documents[0];

        if (!profile || !profile.role) return [];

        // 🔥 luôn trả về array
        return [profile.role.toLowerCase()];
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Kiểm tra user có thuộc một trong các role cho phép hay không
 */
export async function userHasRole(user, allowedRoles) {
    if (!user) return false;
    const roles = await getUserRoles(user);
    const safeRoles = Array.isArray(roles) ? roles : [];
    const checkRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return checkRoles.some(role => safeRoles.includes(role.toLowerCase()));
}

/**
 * Kiểm tra user có quyền cụ thể (Permission) hay không
 */
export async function userHasPermission(user, permission) {
    const roles = await getUserRoles(user);
    const userRole = roles[0]; // Giả định mỗi user 1 role chính

    const rolePermissions = {
        [RBAC.ROLES.ADMIN]: Object.values(RBAC.PERMISSIONS), // Admin có tất cả quyền
        [RBAC.ROLES.KITCHEN]: [RBAC.PERMISSIONS.VIEW_ORDERS, RBAC.PERMISSIONS.UPDATE_ORDER_STATUS],
        [RBAC.ROLES.DELIVERY]: [RBAC.PERMISSIONS.VIEW_ORDERS, RBAC.PERMISSIONS.UPDATE_ORDER_STATUS],
        [RBAC.ROLES.CUSTOMER]: [RBAC.PERMISSIONS.PLACE_ORDER]
    };

    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
}

export function getFriendlyError(error) {
    if (error?.message) return error.message;
    return "Đã xảy ra lỗi, vui lòng thử lại.";
}