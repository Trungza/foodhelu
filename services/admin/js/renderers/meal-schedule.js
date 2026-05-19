import { fetchAllCategories } from "../data/menu-service.js";

const WEEK_DAYS = [
    { id: "mon", label: "Thu 2" },
    { id: "tue", label: "Thu 3" },
    { id: "wed", label: "Thu 4" },
    { id: "thu", label: "Thu 5" },
    { id: "fri", label: "Thu 6" },
    { id: "sat", label: "Thu 7" },
    { id: "sun", label: "Chu nhat" }
];

const FALLBACK_CATEGORIES = [
    { id: "main", label: "Mon chinh" },
    { id: "side", label: "Mon an kem" },
    { id: "drink", label: "Do uong" }
];

function escapeHtml(value) {
    if (!value) return "";
    return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

function normalizeText(value) {
    if (!value) return "";
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "")
        .toLowerCase();
}

async function resolveScheduleCategories() {
    try {
        const categories = await fetchAllCategories();
        const allCategories = categories || [];
        const normalized = allCategories
            .filter((category) => category && category.isActive !== false)
            .sort((a, b) => {
                const orderDiff = (a.order || 0) - (b.order || 0);
                if (orderDiff !== 0) return orderDiff;
                return String(a.name || "").localeCompare(String(b.name || ""));
            })
            .map((category) => ({
                id: category.$id,
                label: category.name || "Danh muc"
            }));

        const hasMain = normalized.some((category) => normalizeText(category.label) === "monchinh");
        if (!hasMain) {
            const mainCategory = allCategories.find((category) => {
                const slug = normalizeText(category?.slug);
                const name = normalizeText(category?.name);
                return slug === "main" || name === "monchinh";
            });
            if (mainCategory) {
                normalized.unshift({
                    id: mainCategory.$id,
                    label: mainCategory.name || "Mon chinh"
                });
            }
        }

        if (normalized.length > 0) return normalized;
    } catch (error) {
        console.error("Khong tai duoc category cho lich an:", error);
    }

    return FALLBACK_CATEGORIES;
}

function renderCategoryNav(categories) {
    const categoryItems = categories.map((category) => `
        <button
            type="button"
            class="meal-category-nav-item"
            data-category-id="${escapeHtml(category.id)}"
            data-category-name="${escapeHtml(category.label)}"
        >
            <span>${escapeHtml(category.label)}</span>
        </button>
    `).join("");

    const comboItem = `
        <button
            type="button"
            class="meal-category-nav-item meal-category-nav-item-combo"
            data-category-id="__combo__"
            data-category-name="Combo"
        >
            <span>Combo</span>
        </button>
    `;

    return `${categoryItems}${comboItem}`;
}

export async function renderMealSchedule() {
    const categories = await resolveScheduleCategories();

    const dayTabs = WEEK_DAYS.map((day, index) => `
        <button
            type="button"
            class="meal-week-tab-btn ${index === 0 ? "active" : ""}"
            data-day="${day.id}"
            aria-selected="${index === 0 ? "true" : "false"}"
        >
            ${day.label}
        </button>
    `).join("");

    const categoryNav = renderCategoryNav(categories);

    const dayPanels = WEEK_DAYS.map((day, index) => `
        <section class="meal-week-panel ${index === 0 ? "active" : ""}" data-day-panel="${day.id}" data-day-label="${day.label}">
            <div class="meal-config-layout">
                <aside class="meal-category-nav" aria-label="Danh muc mon an">
                    ${categoryNav}
                </aside>
                <div class="meal-category-workspace">
                    <button type="button" class="meal-add-combo-btn" data-day="${day.id}" data-day-label="${day.label}" hidden aria-label="Tao combo">
                        Tao combo
                    </button>
                    <button type="button" class="meal-add-dish-btn" data-day="${day.id}" data-day-label="${day.label}" hidden aria-label="Chon mon">
                        <i class="fas fa-plus"></i>
                    </button>
                    <div class="meal-picked-dishes" aria-live="polite"></div>
                    <div class="meal-picked-combos" aria-live="polite"></div>
                </div>
            </div>
        </section>
    `).join("");

    return `
        <div class="meal-schedule-card">
            <div class="table-header">
                <h3>Lịch ăn theo tuần</h3>
                <div class="meal-schedule-actions">
    
                    <button class="meal-schedule-publish-btn" type="button" title="Dang lich tuan" aria-label="Dang lich tuan">Đăng lịch</button>
                </div>
            </div>
            <div class="meal-week-tabs-shell">
                <div class="meal-week-tabs" role="tablist" aria-label="Lich an theo ngay trong tuan">
                    ${dayTabs}
                </div>
            </div>
            <div class="meal-week-panels">
                ${dayPanels}
            </div>
        </div>
    `;
}
