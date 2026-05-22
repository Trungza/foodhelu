// BANNER.JS - SLIDER HOÃ€N CHá»ˆNH Vá»šI ANIMATION Äá»’NG Bá»˜

// Dá»¯ liá»‡u banner
let bannerData = [
    { fullImage: "img/banner.jpg", alt: "Helu Food banner" },
    { fullImage: "img/banner2.jpg", alt: "Helu Food banner 2" },
];

let currentIndex = 0;
let autoInterval;
let isAnimating = false;
const AUTO_PLAY_INTERVAL = 5000;
const SLIDE_TRANSITION_DURATION = 800; // Thá»i gian lÃ½ tÆ°á»Ÿng Ä‘á»ƒ cáº£m nháº­n Ä‘Æ°á»£c hiá»‡u á»©ng trÆ°á»£t mÆ°á»£t mÃ 

// DOM Elements
const sliderWrapper = document.getElementById('sliderWrapper');
const sliderDots = document.getElementById('sliderDots');
const prevBtn = document.getElementById('prevSlide');
const nextBtn = document.getElementById('nextSlide');

// Táº¡o HTML cho slide
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
                    <!-- Cá»™t trÃ¡i: ThÃ´ng tin -->
                    <div class="slide-info">
                        <div class="slide-badge">${item.badge}</div>
                        <h1 class="slide-title">${item.title}</h1>
                        <div class="slide-price">${item.price}</div>
                        <p class="slide-description">${item.description}</p>
                        <button class="btn-order" onclick="scrollToMenu()">${item.buttonText}</button>
                    </div>
                    
                    <!-- Cá»™t pháº£i: HÃ¬nh áº£nh -->
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
    // KÃ­ch hoáº¡t class active cho slide Ä‘áº§u tiÃªn
    const firstSlide = sliderWrapper.querySelector('.slide');
    if (firstSlide) firstSlide.classList.add('active');
    console.log('ÄÃ£ render', bannerData.length, 'slides');
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

// ANIMATION Äá»’NG Bá»˜ - áº¢NH VÃ€ TEXT CHáº Y CÃ™NG LÃšC
function animateElements() {
    // Gá»¡ bá» cÃ¡c hiá»‡u á»©ng Zoom vÃ  trÆ°á»£t ná»™i dung bÃªn trong (Entrance Animations)
    // Äáº£m báº£o táº¥t cáº£ cÃ¡c thÃ nh pháº§n luÃ´n hiá»ƒn thá»‹ Ä‘á»ƒ khÃ´ng lÃ m giÃ¡n Ä‘oáº¡n hiá»‡u á»©ng trÆ°á»£t ngang cá»§a khá»‘i slider
    const elements = document.querySelectorAll('.slide-badge, .slide-title, .slide-price, .slide-description, .btn-order, .food-image, .banner-full-image');
    
    elements.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.transition = 'none';
    });
}

// Chuyá»ƒn slide
function goToSlide(index) {
    if (isAnimating) return;
    if (index < 0) index = bannerData.length - 1;
    if (index >= bannerData.length) index = 0;
    if (index === currentIndex) return;
    
    isAnimating = true;

    // Äáº£m báº£o transition luÃ´n Ä‘Æ°á»£c thiáº¿t láº­p cho wrapper trÆ°á»›c khi trÆ°á»£t
    sliderWrapper.style.transition = `transform ${SLIDE_TRANSITION_DURATION}ms cubic-bezier(0.645, 0.045, 0.355, 1)`;
    sliderWrapper.style.willChange = 'transform';

    currentIndex = index;
    
    const offset = -currentIndex * 100;
    // Thá»±c hiá»‡n chuyá»ƒn Ä‘á»™ng trÆ°á»£t ngang 3D (táº­n dá»¥ng GPU)
    sliderWrapper.style.transform = `translate3d(${offset}%, 0, 0)`;
    
    // Cáº­p nháº­t tráº¡ng thÃ¡i active vÃ  reset cÃ¡c style thá»«a
    document.querySelectorAll('.slide').forEach((slide, i) => {
        slide.style.filter = 'none';
        slide.style.opacity = '1';
        if (i === currentIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });

    // Cáº­p nháº­t dots
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
    });
    
    // KÃ­ch hoáº¡t hiá»‡u á»©ng ná»™i dung ngay khi báº¯t Ä‘áº§u chuyá»ƒn slide
    animateElements();
    
    setTimeout(() => {
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

// Khá»Ÿi táº¡o slider
function init() {
    console.log('Khá»Ÿi táº¡o banner...');
    renderSlides();
    renderDots();
    animateElements();

    // Đặt vị trí ban đầu (đảm bảo slider trượt ngang đúng ngay từ slide đầu)
    if (sliderWrapper) {
        sliderWrapper.style.transform = 'translate3d(0%, 0, 0)';
    }
    
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    const container = document.querySelector('.slider-container');
    if (container) {
        container.addEventListener('mouseenter', stopAutoPlay);
        container.addEventListener('mouseleave', startAutoPlay);
    }
    
    startAutoPlay();
}

// Cháº¡y khi trang load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.scrollToMenu = scrollToMenu;
