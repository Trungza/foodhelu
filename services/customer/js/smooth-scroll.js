// Scroll functions
function scrollToMenu() {
    const menuSection = document.getElementById('menu');
    if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToReservation() {
    const reservationSection = document.getElementById('reservation');
    if (reservationSection) {
        reservationSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Smooth scroll for all anchor links
function setupSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}