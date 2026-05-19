// BANNER.JS - SLIDER HOÀN CHỈNH VỚI ANIMATION ĐỒNG BỘ

// Dữ liệu banner
let bannerData = [
    { fullImage: "img/banner.jpg", alt: "Helu Food banner" },
    { fullImage: "img/banner2.jpg", alt: "Helu Food banner 2" },
];

let currentIndex = 0;
let autoInterval;
let isAnimating = false;
const AUTO_PLAY_INTERVAL = 5000;
const SLIDE_TRANSITION_DURATION = 800;

// DOM Elements
const sliderWrapper = document.getElementById('sliderWrapper');
const sliderDots = document.getElementById('sliderDots');
const prevBtn = document.getElementById('prevSlide');
const nextBtn = document.getElementById('nextSlide');

// Tạo HTML cho slide
function createSlideHTML(item, index) {
    if (item && item.fullImage) {
        const alt = item.alt || "Banner";
        return `
            <div class="slide slide-full-image" data-index="${index}">
                <img src="${item.fullImage}" alt="${alt}" class="banner-full-image" loading="eager">
            </div>
        `;
    }
    return `
        <div class="slide" data-index="${index}">
            <div class="slide-content container">
                <div class="slide-grid">
                    <!-- Cột trái: Thông tin -->
                    <div class="slide-info">
                        <div class="slide-badge">${item.badge}</div>
                        <h1 class="slide-title">${item.title}</h1>
                        <div class="slide-price">${item.price}</div>
                        <p class="slide-description">${item.description}</p>
                        <button class="btn-order" onclick="scrollToMenu()">${item.buttonText}</button>
                    </div>
                    
                    <!-- Cột phải: Hình ảnh -->
                    <div class="slide-image">
                        <img src="${item.foodImage}" alt="Food" class="food-image">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render slides
function renderSlides() {
    if (!sliderWrapper) return;
    sliderWrapper.innerHTML = '';
    bannerData.forEach((item, index) => {
        sliderWrapper.innerHTML += createSlideHTML(item, index);
    });
    // Kích hoạt class active cho slide đầu tiên
    const firstSlide = sliderWrapper.querySelector('.slide');
    if (firstSlide) firstSlide.classList.add('active');
    console.log('Đã render', bannerData.length, 'slides');
}

// Render dots
function renderDots() {
    if (!sliderDots) return;
    
    let dotsHtml = '';
    for (let i = 0; i < bannerData.length; i++) {
        dotsHtml += `<div class="dot ${i === currentIndex ? 'active' : ''}" data-index="${i}"></div>`;
    }
    sliderDots.innerHTML = dotsHtml;
    
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            goToSlide(index);
            resetAutoPlay();
        });
    });
}

// ANIMATION ĐỒNG BỘ - ẢNH VÀ TEXT CHẠY CÙNG LÚC
function animateElements() {
    return;
}

// Chuyển slide
function goToSlide(index) {
    if (isAnimating) return;
    if (index < 0) index = bannerData.length - 1;
    if (index >= bannerData.length) index = 0;
    if (index === currentIndex) return;
    
    isAnimating = true;
    currentIndex = index;
    
    const offset = -currentIndex * 100;
    sliderWrapper.style.transform = `translateX(${offset}%)`;
    
    // Cập nhật class active cho các slide để kích hoạt hiệu ứng CSS
    document.querySelectorAll('.slide').forEach((slide, i) => {
        if (i === currentIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });

    // Cập nhật dots
    document.querySelectorAll('.dot').forEach((dot, i) => {
        if (i === currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Animation sau khi chuyển slide
    setTimeout(() => {
        animateElements();
        isAnimating = false;
    }, SLIDE_TRANSITION_DURATION);
}

function nextSlide() {
    goToSlide(currentIndex + 1);
    resetAutoPlay();
}

function prevSlide() {
    goToSlide(currentIndex - 1);
    resetAutoPlay();
}

// Auto play
function startAutoPlay() {
    if (autoInterval) clearInterval(autoInterval);
    autoInterval = setInterval(() => {
        if (!isAnimating) {
            nextSlide();
        }
    }, AUTO_PLAY_INTERVAL);
}

function stopAutoPlay() {
    if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
    }
}

function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
}

// Scroll function
function scrollToMenu() {
    const menuSection = document.getElementById('menu');
    if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Khởi tạo slider
function init() {
    console.log('Khởi tạo banner...');
    renderSlides();
    renderDots();
    animateElements();
    
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    const container = document.querySelector('.slider-container');
    if (container) {
        container.addEventListener('mouseenter', stopAutoPlay);
        container.addEventListener('mouseleave', startAutoPlay);
    }
    
    startAutoPlay();
}

// Chạy khi trang load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.scrollToMenu = scrollToMenu;
