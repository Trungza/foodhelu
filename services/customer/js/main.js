// MAIN.JS - TẬP HỢP TẤT CẢ CÁC FUNCTION
import { getSystemSettings, subscribeSystemSettings } from "../../shared/js/system-settings.js";

function purgeLocalStorageExceptCart() {
  try {
    const keep = new Set(["cart"]);
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    keys.forEach((key) => {
      if (!keep.has(key)) localStorage.removeItem(key);
    });
  } catch {}
}

function ensureAcceptingBanner() {
  let banner = document.getElementById("acceptingOrdersBanner");
  if (banner) return banner;
  banner = document.createElement("div");
  banner.id = "acceptingOrdersBanner";
  banner.style.cssText = [
    "position: sticky",
    "top: 0",
    "z-index: 9999",
    "display: none",
    "padding: 10px 14px",
    "background: rgba(239,68,68,0.92)",
    "color: #fff",
    "font-weight: 700",
    "text-align: center",
    "border-bottom: 1px solid rgba(0,0,0,0.25)",
  ].join(";");
  banner.textContent = "⏸️ Tạm ngừng nhận đơn. Vui lòng quay lại sau.";
  document.body.prepend(banner);
  return banner;
}

function applyAcceptingOrdersUi(acceptingOrders) {
  const banner = ensureAcceptingBanner();
  banner.style.display = acceptingOrders === false ? "block" : "none";
}

// Khởi tạo tất cả khi trang load
document.addEventListener("DOMContentLoaded", async () => {
  purgeLocalStorageExceptCart();

  // System settings banner
  try {
    const s = await getSystemSettings();
    applyAcceptingOrdersUi(s.acceptingOrders);
    subscribeSystemSettings((next) => applyAcceptingOrdersUi(next.acceptingOrders));
  } catch {}

  // Header scroll effect
  if (typeof handleHeaderScroll === "function") {
    handleHeaderScroll();
    window.addEventListener("scroll", handleHeaderScroll);
  }

  // Hiển thị testimonials
  if (typeof displayTestimonials === "function") {
    displayTestimonials();
  }

  // Setup filters
  if (typeof setupFilters === "function") {
    setupFilters();
  }

  // Setup form
  if (typeof setupForm === "function") {
    setupForm();
  }

  // Setup smooth scroll
  if (typeof setupSmoothScroll === "function") {
    setupSmoothScroll();
  }

  // Update cart count
  if (typeof updateCartCount === "function") {
    updateCartCount();
  }
});
