// MAIN.JS - TẬP HỢP TẤT CẢ CÁC FUNCTION
import { getSystemSettings, subscribeSystemSettings } from "../../shared/js/system-settings.js";

// Cấu hình loader để đảm bảo người dùng có thể nhìn thấy animation
const LOADER_START_TIME = Date.now();
const MINIMUM_LOADER_DURATION = 800; // Hiển thị tối thiểu 0.8 giây

// --- Page Loader Logic ---
// Hàm này tạo và chèn HTML và CSS cho page loader vào tài liệu.
// Nó được gọi ngay lập tức khi script tải để đảm bảo loader hiển thị sớm nhất có thể.
function createAndInjectPageLoader() {
  // Kiểm tra nếu loader đã tồn tại để tránh tạo trùng lặp
  if (document.getElementById('page-loader')) return;

  const loaderHtml = `
        <div id="page-loader" class="page-loader">
            <div class="loader-wrapper">
                <div class="loader-spinner"></div>
                <img src="img/logo.png" class="loader-logo" alt="Logo" onerror="this.style.display='none'">
            </div>
        </div>
    `;
  
  // Chèn vào đầu body để đảm bảo hiển thị sớm nhất
  if (document.body) {
    document.body.insertAdjacentHTML('afterbegin', loaderHtml);
  }

  // Chèn CSS cho loader
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
            z-index: 99999; /* Đảm bảo nó nằm trên tất cả các phần tử khác */
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
            /* Hiệu ứng đập nhẹ cho logo */
            animation: logo-pulse 2s ease-in-out infinite;
        }

        .loader-spinner {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 3px solid rgba(0, 0, 0, 0.05); /* Vòng lót tối hơn để hiện trên nền trắng */
            border-top: 3px solid #3b82f6;
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

        body.orders-paused {
          overflow: hidden;
          touch-action: none;
        }

        #acceptingOrdersBanner {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        #acceptingOrdersBanner .accepting-orders-banner-card {
          width: min(520px, calc(100vw - 32px));
          padding: 30px 28px 26px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.45);
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
          text-align: center;
          color: #0f172a;
        }

        #acceptingOrdersBanner .accepting-orders-banner-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: #fff;
          font-size: 28px;
          box-shadow: 0 18px 28px rgba(239, 68, 68, 0.28);
        }

        #acceptingOrdersBanner h2 {
          margin: 0 0 10px;
          font-size: clamp(26px, 4vw, 36px);
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        #acceptingOrdersBanner p {
          margin: 0;
          font-size: 16px;
          line-height: 1.7;
          color: #475569;
        }
    `;
  document.head.appendChild(style);
}

// Hàm này ẩn page loader.
// Nó được gọi sau khi nội dung DOM đã tải hoàn toàn và các script khởi tạo đã chạy.
async function hidePageLoader() {
  const currentTime = Date.now();
  const timeElapsed = currentTime - LOADER_START_TIME;
  const remainingTime = Math.max(0, MINIMUM_LOADER_DURATION - timeElapsed);

  // Chỉ ẩn sau khi đã hiển thị đủ thời gian tối thiểu
  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('hidden');
      loader.addEventListener('transitionend', () => loader.remove());
    }
  }, remainingTime);
}

// Gọi hàm này ngay lập tức để hiển thị loader ngay khi script được thực thi
createAndInjectPageLoader();

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
  banner.setAttribute("role", "alert");
  banner.setAttribute("aria-live", "assertive");
  banner.innerHTML = `
    <div class="accepting-orders-banner-card">
      <div class="accepting-orders-banner-icon">
        <i class="fas fa-circle-pause"></i>
      </div>
      <h2>Tạm ngừng nhận đơn</h2>
      <p>Vui lòng quay lại sau.</p>
    </div>
  `;
  document.body.prepend(banner);
  return banner;
}

function applyAcceptingOrdersUi(acceptingOrders) {
  const banner = ensureAcceptingBanner();
  const ordersPaused = acceptingOrders === false;
  banner.style.display = ordersPaused ? "flex" : "none";
  document.body.classList.toggle("orders-paused", ordersPaused);
  document.documentElement.classList.toggle("orders-paused", ordersPaused);
  window.__acceptingOrdersLocked = ordersPaused;
}

// Khởi tạo tất cả khi trang load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    purgeLocalStorageExceptCart();

    // System settings banner
    try {
      const s = await getSystemSettings();
      applyAcceptingOrdersUi(s.acceptingOrders);
      subscribeSystemSettings((next) => applyAcceptingOrdersUi(next.acceptingOrders));
    } catch (e) {
      console.warn("Lỗi tải cài đặt hệ thống:", e);
    }

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
  } finally {
    // Luôn luôn gọi ẩn loader dù có lỗi xảy ra hay không
    hidePageLoader();
  }
});
