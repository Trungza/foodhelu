const ADMIN_ACTIVE_TAB_KEY = "adminActiveTab";

export function initTabs(root) {
    const buttons = root.querySelectorAll(".tab-btn");
    const panels = root.querySelectorAll(".tab-panel");
    const savedTab = sessionStorage.getItem(ADMIN_ACTIVE_TAB_KEY);

    const activateTab = (tabId) => {
        buttons.forEach(item => item.classList.toggle("active", item.dataset.tab === tabId));
        panels.forEach(item => item.classList.toggle("active", item.id === tabId));
        sessionStorage.setItem(ADMIN_ACTIVE_TAB_KEY, tabId);
    };

    if (savedTab && root.querySelector(`#${savedTab}`)) {
        activateTab(savedTab);
    }

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            activateTab(button.dataset.tab);
        });
    });
}
