// Dữ liệu testimonials
const testimonialsData = [
    {
        name: "Sarah Johnson",
        text: "Amazing food! The atmosphere is perfect for a romantic dinner.",
        rating: 5,
        image: "https://randomuser.me/api/portraits/women/1.jpg"
    },
    {
        name: "Michael Chen",
        text: "Best restaurant in town. The truffle pizza is to die for!",
        rating: 5,
        image: "https://randomuser.me/api/portraits/men/2.jpg"
    },
    {
        name: "Emma Davis",
        text: "Great service and delicious food. Will definitely come back.",
        rating: 4,
        image: "https://randomuser.me/api/portraits/women/3.jpg"
    }
];

// Hiển thị testimonials
function displayTestimonials() {
    const slider = document.getElementById('testimonialsSlider');
    if (!slider) return;
    
    slider.innerHTML = testimonialsData.map(testimonial => `
        <div class="testimonial-card">
            <img src="${testimonial.image}" alt="${testimonial.name}">
            <div>
                ${'<i class="fas fa-star"></i>'.repeat(testimonial.rating)}
            </div>
            <p>"${testimonial.text}"</p>
            <h4>${testimonial.name}</h4>
        </div>
    `).join('');
}