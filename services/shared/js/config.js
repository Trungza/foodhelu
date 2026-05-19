export const APPWRITE_CONFIG = {
    ENDPOINT: "https://fra.cloud.appwrite.io/v1",
    PROJECT_ID: "69eb91050034ff637921",
    BUCKET_ID: "69ef76a50023f9ddf330"
};

export const DB = {
    DATABASE_ID: "69eb95be00398251344a",
    COLLECTIONS: {
        USERS: "accounts",
        CATEGORIES: "categories",
        DISHES: "dishes",
        GALLERY_MEDIA: "gallery_media",
        DAILY_MENU: "daily_menu",
        COMBOS: "combos",
        COMBO_ITEMS: "combo_items",
        WEEKLY_SCHEDULES: "weekly_schedules",
        ORDERS: "orders",
        DAILY_STOCK: "daily_stock",
        NOTIFICATIONS: "notifications",
        SYSTEM_SETTINGS: "system_settings"
    }
};

export const RBAC = {
    ROLES: {
        ADMIN: "admin",
        KITCHEN: "kitchen",
        DELIVERY: "delivery",
        CUSTOMER: "customer"
    },
    PERMISSIONS: {
        MANAGE_MENU: "manage_menu",
        MANAGE_STAFF: "manage_staff",
        VIEW_ORDERS: "view_orders",
        UPDATE_ORDER_STATUS: "update_order_status",
        VIEW_ANALYTICS: "view_analytics",
        PLACE_ORDER: "place_order"
    }
};
