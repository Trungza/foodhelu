export const mockStats = {
    totalRevenue: 12580000,
    totalOrders: 342,
    pendingOrders: 8,
    completedToday: 24
};

export const mockEmployees = [
    { id: 1, name: "Trần Văn Bếp", email: "k1@foodu.com", role: "kitchen", status: "active" },
    { id: 2, name: "Lê Thị Nấu", email: "k2@foodu.com", role: "kitchen", status: "active" }
];

export const mockOrders = [
    {
        id: "#ORD001",
        customer: "Nguyễn Văn A",
        phone: "0901234567",
        time: "2026-04-28 10:30",
        total: 450000,
        items: ["Cơm tấm sườn x2", "Trà đá x1"],
        status: "pending_admin",
        kitchenStatus: "active",
        warning: null,
        systemNote: "Đơn mới từ khách",
        priority: "normal"
    },
    {
        id: "#ORD002",
        customer: "Trần Thị B",
        phone: "0912345678",
        time: "2026-04-28 09:15",
        total: 320000,
        items: ["Bún bò Huế x1"],
        status: "sent_to_kitchen",
        kitchenStatus: "active",
        warning: null,
        systemNote: "Đã gửi bếp",
        priority: "normal"
    },
    {
        id: "#ORD003",
        customer: "Lê Văn C",
        phone: "0987654321",
        time: "2026-04-28 08:00",
        total: 890000,
        items: ["Combo gia đình x1"],
        status: "hold",
        kitchenStatus: "issue",
        warning: "out_of_stock",
        systemNote: "Bếp báo thiếu nguyên liệu",
        priority: "high"
    },
    {
        id: "#ORD004",
        customer: "Phạm Thị D",
        phone: "0933112233",
        time: "2026-04-28 11:20",
        total: 210000,
        items: ["Cơm gà xối mỡ x2"],
        status: "pending_admin",
        kitchenStatus: "paused",
        warning: "kitchen_overload",
        systemNote: "Bếp đang quá tải - tạm dừng nhận đơn",
        priority: "urgent"
    },
    {
        id: "#ORD005",
        customer: "Hoàng Văn E",
        phone: "0909991111",
        time: "2026-04-28 10:00",
        total: 550000,
        items: ["Combo hải sản x1"],
        status: "done",
        kitchenStatus: "active",
        warning: null,
        systemNote: "Hoàn thành",
        priority: "normal"
    }
];

export const mockFoods = [
    { id: 1, name: "Cơm gà xối mỡ", category: "main", price: 45000, stock: 20, active: true },
    { id: 2, name: "Bún bò Huế", category: "main", price: 50000, stock: 0, active: true },
    { id: 3, name: "Trà sữa", category: "drink", price: 30000, stock: 100, active: true }
];

export const mockMealSchedule = [
    {
        id: "S1",
        date: "2026-04-28",
        meals: [
            { time: "Sáng", name: "Bún bò Huế", status: "available" },
            { time: "Trưa", name: "Cơm gà xối mỡ", status: "available" },
            { time: "Tối", name: "Phở bò", status: "out_of_stock" }
        ]
    },
    {
        id: "S2",
        date: "2026-04-29",
        meals: [
            { time: "Sáng", name: "Bánh mì ốp la", status: "available" },
            { time: "Trưa", name: "Cơm sườn", status: "available" },
            { time: "Tối", name: "Hải sản combo", status: "available" }
        ]
    }
];
