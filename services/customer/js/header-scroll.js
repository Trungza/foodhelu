// HEADER-SCROLL.JS - THÊM ACTIVE MENU

// Xử lý active menu khi scroll
function setActiveMenu() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let current = '';
    const scrollPosition = window.scrollY + 150; // Offset cho header
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href').substring(1); // Bỏ dấu #
        if (href === current) {
            link.classList.add('active');
        }
    });
}

// Header scroll effect - ĐỔI MÀU KHI CUỘN
function handleHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    
    const scrollThreshold = 50;
    
    if (window.scrollY > scrollThreshold) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // Cập nhật active menu khi scroll
    setActiveMenu();
}

// Lắng nghe sự kiện cuộn
window.addEventListener('scroll', handleHeaderScroll);

// Gọi khi load trang
document.addEventListener('DOMContentLoaded', () => {
    handleHeaderScroll();
    setActiveMenu();
});