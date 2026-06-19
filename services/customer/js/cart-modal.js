// CART.JS - QUẢN LÝ GIỎ HÀNG VÀ CHECKOUT
import { databases, DATABASE_ID, ID, Query } from '../../shared/js/appwrite.js';
import { DB } from '../../shared/js/config.js';
import { getSystemSettings } from '../../shared/js/system-settings.js';
// Dữ liệu giỏ hàng
let cart = [];
let isCheckoutMode = false;

function isOrdersPaused() {
    return window.__acceptingOrdersLocked === true;
}

function getTodayDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function collectStockUsageFromCartItems(items) {
    const usageByDishId = new Map();

    items.forEach((item) => {
        if (item.isCombo && Array.isArray(item.comboItems)) {
            item.comboItems.forEach((comboItem) => {
                const dishId = String(comboItem?.dishId || '').trim();
                const qtyPerCombo = Number(comboItem?.qtyPerCombo || 0);
                if (!dishId || qtyPerCombo <= 0) return;

                const current = usageByDishId.get(dishId) || 0;
                usageByDishId.set(dishId, current + (Number(item.quantity || 0) * qtyPerCombo));
            });
            return;
        }

        const dishId = String(item?.dishId || item?.id || '').trim();
        const quantity = Number(item?.quantity || 0);
        if (!dishId || quantity <= 0) return;

        const current = usageByDishId.get(dishId) || 0;
        usageByDishId.set(dishId, current + quantity);
    });

    return usageByDishId;
}

async function updateDailyStockForCartItems(items, direction = 1) {
    const usageByDishId = collectStockUsageFromCartItems(items);
    if (!usageByDishId.size) return;

    const dateKey = getTodayDateKey();
    const stockDocsRes = await databases.listDocuments(DATABASE_ID, DB.COLLECTIONS.DAILY_STOCK, [
        Query.equal('dateKey', dateKey)
    ]);

    const stockDocsByDishId = new Map();
    (stockDocsRes.documents || []).forEach((doc) => {
        const dishId = String(doc?.dishId || '').trim();
        if (!dishId) return;
        stockDocsByDishId.set(dishId, doc);
    });

    const updates = [];
    usageByDishId.forEach((usage, dishId) => {
        const stockDoc = stockDocsByDishId.get(dishId);
        if (!stockDoc) return;

        const delta = Number(usage) * Number(direction || 1);
        if (!delta) return;

        const remainingQty = Number.isFinite(Number(stockDoc?.remainingQty))
            ? Number(stockDoc.remainingQty)
            : Math.max(0,
                (Number(stockDoc?.openingQty) || 0)
                - (Number(stockDoc?.soldAutoQty) || 0)
                - (Number(stockDoc?.soldAdjustQty) || 0)
            );
        const openingQty = Number.isFinite(Number(stockDoc?.openingQty))
            ? Number(stockDoc.openingQty)
            : null;

        const rawNextRemainingQty = remainingQty - delta;
        const nextRemainingQty = delta > 0
            ? Math.max(0, rawNextRemainingQty)
            : (openingQty !== null ? Math.min(openingQty, rawNextRemainingQty) : Math.max(0, rawNextRemainingQty));
        const nextSoldAutoQty = Math.max(0, (Number(stockDoc?.soldAutoQty) || 0) + delta);

        if (delta > 0 && rawNextRemainingQty < 0) {
            throw new Error(`Không đủ tồn kho cho món ${stockDoc.dishName || dishId}`);
        }

        updates.push(
            databases.updateDocument(DATABASE_ID, DB.COLLECTIONS.DAILY_STOCK, stockDoc.$id, {
                remainingQty: nextRemainingQty,
                soldAutoQty: nextSoldAutoQty,
                updatedAt: new Date().toISOString()
            })
        );
    });

    await Promise.all(updates);
}

async function syncCustomerAvailabilityViews() {
    const refreshTasks = [];
    if (typeof window.refreshDishesFromDb === 'function') {
        refreshTasks.push(window.refreshDishesFromDb());
    }
    if (typeof window.refreshMenuCombosFromDb === 'function') {
        refreshTasks.push(window.refreshMenuCombosFromDb());
    }

    if (!refreshTasks.length) return;
    await Promise.all(refreshTasks);
}

// ========== HÀM CƠ BẢN ==========

// Hiệu ứng rung cho card ở menu hoặc trong modal
function triggerCardShake(id, isCombo) {
    // Tìm card ở menu chính (nếu có)
    const menuSelector = isCombo ? `.menu-item[data-combo-id="${id}"]` : `.dish-card[data-id="${id}"]`;
    const menuCard = document.querySelector(menuSelector);

    // Tìm card trong modal giỏ hàng
    const cartCard = document.querySelector(`.cart-item[data-id="${id}"]`);

    [menuCard, cartCard].forEach(el => {
        if (el) {
            el.classList.remove('modal-shake');
            void el.offsetWidth; // Force reflow
            el.classList.add('modal-shake');
            setTimeout(() => el.classList.remove('modal-shake'), 500);
        }
    });
}

// Kiểm tra xem một item trong giỏ (món lẻ hoặc combo) có đủ tồn kho cho số lượng yêu cầu không
function isAtMaxStock(item, requestedQuantity) {
    const components = [];
    const isCheckingCombo = !!item.isCombo;

    // 1. Xác định tất cả các món ăn thành phần cần kiểm tra stock
    if (isCheckingCombo && item.comboItems) {
        item.comboItems.forEach(ci => components.push({
            dishId: String(ci.dishId), name: ci.name, qtyPer: ci.qtyPerCombo, max: ci.maxStock
        }));
    } else {
        components.push({
            dishId: String(item.dishId || item.id), name: item.name, qtyPer: 1, max: item.maxStock
        });
    }

    // 2. Kiểm tra tổng nhu cầu của từng món thành phần so với tồn kho thực tế
    for (const comp of components) {
        let currentUsageInCart = 0;
        // Lấy giới hạn kho từ item hiện tại, nếu không có thì mặc định là 999
        let bestStockLimit = (comp.max !== undefined && comp.max !== null) ? Number(comp.max) : 999;

        cart.forEach(cartItem => {
            // Tìm lượng sử dụng món 'comp.dishId' trong các item KHÁC đang có trong giỏ
            let usage = 0;
            if (cartItem.isCombo && cartItem.comboItems) {
                const sub = cartItem.comboItems.find(ci => String(ci.dishId) === comp.dishId);
                if (sub) usage = cartItem.quantity * sub.qtyPerCombo;
            } else {
                const cartDishId = String(cartItem.dishId || cartItem.id);
                if (cartDishId === comp.dishId) usage = cartItem.quantity;
            }

            // Nếu đây là chính line item chúng ta đang muốn cập nhật/thêm, bỏ qua không cộng vào usage
            // vì chúng ta sẽ dùng 'requestedQuantity' để thay thế cho nó ở bước tính tổng cuối cùng.
            if (String(cartItem.id) === String(item.id) && !!cartItem.isCombo === isCheckingCombo) return;

            currentUsageInCart += usage;
        });

        const totalDemand = currentUsageInCart + (requestedQuantity * comp.qtyPer);
        if (totalDemand > bestStockLimit) return true;
    }
    return false;
}

// Thêm sản phẩm vào giỏ hàng
async function addToCart(product) {
    if (!product || !product.id) return;
    if (isOrdersPaused()) {
        showToast('⏸️ Hệ thống đang tạm ngừng nhận đơn. Vui lòng quay lại sau.', 'error');
        return;
    }

    const existingProduct = cart.find(item => String(item.id) === String(product.id));
    const stockChangeItem = {
        id: product.id,
        dishId: product.dishId,
        name: product.name || 'Không rõ tên',
        price: product.price || 0,
        image: product.image || '',
        quantity: 1,
        maxStock: product.maxStock,
        isCombo: product.isCombo || false,
        comboItems: product.comboItems || null,
        note: product.note || ''
    };

    if (existingProduct) {
        try {
            await updateDailyStockForCartItems([{ ...stockChangeItem, quantity: 1 }], 1);
        } catch (error) {
            showToast(error?.message || `Vượt quá giới hạn phục vụ cho ${product.name}`, 'error');
            triggerCardShake(product.id, product.isCombo);
            return;
        }
        existingProduct.quantity += 1;
    } else {
        try {
            await updateDailyStockForCartItems([stockChangeItem], 1);
        } catch (error) {
            showToast(error?.message || `Rất tiếc, món này không đủ số lượng để phục vụ`, 'error');
            triggerCardShake(product.id, product.isCombo);
            return;
        }
        cart.push({
            id: stockChangeItem.id,
            dishId: stockChangeItem.dishId,
            name: stockChangeItem.name,
            price: stockChangeItem.price,
            image: stockChangeItem.image,
            quantity: 1,
            maxStock: stockChangeItem.maxStock,
            isCombo: stockChangeItem.isCombo,
            comboItems: stockChangeItem.comboItems,
            note: stockChangeItem.note
        });
    }

    updateCartCount();
    saveCartToLocalStorage();
    renderCartItems();
    await syncCustomerAvailabilityViews().catch((error) => {
        console.warn('Không thể làm mới menu sau khi thêm món vào giỏ:', error);
    });
    showToast(`${product.name} đã được thêm vào giỏ hàng!`, 'success');
}

// Xóa sản phẩm khỏi giỏ hàng
async function removeFromCart(productId) {
    const existingProduct = cart.find(item => String(item.id) === String(productId));
    if (existingProduct) {
        try {
            await updateDailyStockForCartItems([existingProduct], -1);
        } catch (error) {
            showToast(error?.message || 'Không thể hoàn lại tồn kho cho món này', 'error');
            return;
        }
    }

    cart = cart.filter(item => String(item.id) !== String(productId));
    updateCartCount();
    saveCartToLocalStorage();
    renderCartItems();
    await syncCustomerAvailabilityViews().catch((error) => {
        console.warn('Không thể làm mới menu sau khi xóa món khỏi giỏ:', error);
    });
    showToast('Đã xóa món ăn khỏi giỏ hàng', 'info');
}

// Cập nhật số lượng sản phẩm
async function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        await removeFromCart(productId);
        return;
    }

    const product = cart.find(item => String(item.id) === String(productId));
    if (product) {
        const delta = newQuantity - product.quantity;
        if (delta > 0) {
            try {
                await updateDailyStockForCartItems([{ ...product, quantity: delta }], 1);
            } catch (error) {
                showToast(error?.message || `Nhà bếp không còn đủ nguyên liệu cho số lượng này`, 'error');
                triggerCardShake(productId, product.isCombo);
                return;
            }
        } else if (delta < 0) {
            try {
                await updateDailyStockForCartItems([{ ...product, quantity: Math.abs(delta) }], -1);
            } catch (error) {
                showToast(error?.message || 'Không thể cập nhật lại tồn kho', 'error');
                return;
            }
        }

        product.quantity = newQuantity;
        updateCartCount();
        saveCartToLocalStorage();
        renderCartItems();
        await syncCustomerAvailabilityViews().catch((error) => {
            console.warn('Không thể làm mới menu sau khi cập nhật số lượng:', error);
        });
    }
}

// Tính tổng tiền giỏ hàng
function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Cập nhật số lượng hiển thị trên icon giỏ hàng
function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

// Lưu giỏ hàng vào localStorage
function saveCartToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Tải giỏ hàng từ localStorage
function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            updateCartCount();
        } catch (e) {
            console.error('Error loading cart:', e);
            cart = [];
        }
    }
}

// ========== TOAST NOTIFICATION ==========

function showToast(message, type = 'success') {
    // Xóa toast cũ nếu có
    const oldToast = document.querySelector('.custom-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <div class="toast-progress"></div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ========== HIỂN THỊ GIỎ HÀNG ==========

// Hiển thị danh sách sản phẩm trong modal
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalPrice = document.getElementById('cartTotalPrice');

    if (!cartItemsContainer) return;

    if (isCheckoutMode) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <p>Giỏ hàng của bạn đang trống</p>
                <button class="continue-shopping-btn" onclick="closeCartModal()">Tiếp tục chọn món</button>
            </div>
        `;
        if (cartTotalPrice) cartTotalPrice.textContent = '0đ';
        return;
    }
    console.log(cart);

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                ${item.note ? `<div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">${escapeHtml(item.note)}</div>` : ''}
                <div class="cart-item-price">${Number(item.price).toLocaleString('vi-VN')}đ</div>
                <div class="cart-item-quantity">
                    <button class="qty-btn minus" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn plus" onclick="updateQuantity('${item.id}', ${item.quantity + 1})" 
                        ${isAtMaxStock(item, item.quantity + 1) ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>+</button>
                </div>
            </div>
            <div class="cart-item-subtotal">
                ${Number(item.price * item.quantity).toLocaleString('vi-VN')}đ
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');

    const total = calculateTotal();
    if (cartTotalPrice) cartTotalPrice.textContent = `${total.toLocaleString('vi-VN')}đ`;
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== CHECKOUT FORM ==========

function getEarliestDeliveryDate() {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 30, 0, 0);
    return date;
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function updateDeliveryTimeVisibility() {
    const selectedType = document.querySelector('input[name="deliveryTimeType"]:checked')?.value || 'asap';
    const deliveryTimeGroup = document.getElementById('deliveryTimeGroup');
    const deliveryTimeInput = document.getElementById('customerDeliveryTime');
    const minDeliveryDate = getEarliestDeliveryDate();
    const minValue = formatDateTimeLocal(minDeliveryDate);

    if (deliveryTimeInput) {
        deliveryTimeInput.min = minValue;
        if (!deliveryTimeInput.value || deliveryTimeInput.value < minValue) {
            deliveryTimeInput.value = minValue;
        }
    }

    if (deliveryTimeGroup) {
        deliveryTimeGroup.style.display = selectedType === 'scheduled' ? 'block' : 'none';
    }
}

function setupDeliveryTimeOptions() {
    document.querySelectorAll('input[name="deliveryTimeType"]').forEach(input => {
        input.removeEventListener('change', updateDeliveryTimeVisibility);
        input.addEventListener('change', updateDeliveryTimeVisibility);
    });
    updateDeliveryTimeVisibility();
}

// Chuyển sang form checkout
function showCheckoutForm() {
    if (cart.length === 0) {
        showToast('Giỏ hàng của bạn đang trống!', 'error');
        return;
    }

    isCheckoutMode = true;

    const cartItemsContainer = document.getElementById('cartItems');
    const checkoutForm = document.getElementById('checkoutForm');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const backBtn = document.getElementById('backToCartBtn');
    const submitBtn = document.getElementById('submitOrderBtn');
    const modalTitle = document.getElementById('cartModalTitle');

    if (cartItemsContainer) cartItemsContainer.style.display = 'none';
    if (checkoutForm) checkoutForm.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'inline-block';
    if (submitBtn) submitBtn.style.display = 'inline-block';
    if (modalTitle) modalTitle.textContent = 'Thông tin thanh toán';

    // Chèn thêm lựa chọn phương thức thanh toán nếu chưa có
    if (!document.getElementById('paymentMethodGroup')) {
        const paymentHtml = `
            <div class="form-group" id="paymentMethodGroup" style="width: 100%; margin-top: 15px;">
                <label>Phương thức thanh toán</label>
                <div class="payment-options" style="display: flex; gap: 12px; margin-top: 8px;">
                    <label class="payment-option">
                        <input type="radio" name="paymentMethod" value="cash" checked>
                        <div class="payment-card">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>Tiền mặt</span>
                        </div>
                    </label>
                    <label class="payment-option">
                        <input type="radio" name="paymentMethod" value="qr">
                        <div class="payment-card">
                            <i class="fas fa-qrcode"></i>
                            <span>Chuyển khoản QR</span>
                        </div>
                    </label>
                </div>
            </div>
        `;
        checkoutForm.insertAdjacentHTML('beforeend', paymentHtml);
    }

    setupDeliveryTimeOptions();
    updateCheckoutTotal();
}

// Cập nhật tổng tiền trong form checkout
function updateCheckoutTotal() {
    const total = calculateTotal();
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    if (cartTotalPrice) {
        cartTotalPrice.textContent = `${total.toLocaleString('vi-VN')}đ`;
    }
    // Cập nhật tổng tiền trong form nếu có
    const checkoutTotal = document.getElementById('checkoutTotal');
    if (checkoutTotal) {
        checkoutTotal.textContent = `${total.toLocaleString('vi-VN')}đ`;
    }
}

// Quay lại giỏ hàng
function backToCart() {
    isCheckoutMode = false;

    const cartItemsContainer = document.getElementById('cartItems');
    const checkoutForm = document.getElementById('checkoutForm');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const backBtn = document.getElementById('backToCartBtn');
    const submitBtn = document.getElementById('submitOrderBtn');
    const modalTitle = document.getElementById('cartModalTitle');

    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (checkoutForm) checkoutForm.style.display = 'none';
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    if (backBtn) backBtn.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Giỏ hàng';

    renderCartItems();
}

// Hiển thị loading
function showLoading(show) {
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Xác nhận đặt hàng';
        }
    }
}

// Hàm tạo hiệu ứng rung cho modal
function triggerModalShake() {
    const modalContent = document.querySelector('.cart-modal-content');
    if (modalContent) {
        modalContent.classList.remove('modal-shake');
        void modalContent.offsetWidth; // Force reflow
        modalContent.classList.add('modal-shake');
        setTimeout(() => modalContent.classList.remove('modal-shake'), 500);
    }
}

/**
 * Hiển thị Modal QR Code để thanh toán
 */
function showQRModal(orderId, amount) {
    const bankId = "MB"; // Thay bằng ID ngân hàng của bạn (ví dụ: VCB, MB, ICB)
    const accountNo = "0376390692"; // Thay bằng số tài khoản của bạn
    const accountName = "NGUYEN BA TRUNG"; // Thay bằng tên chủ tài khoản (không dấu)
    
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=HELUFOOD ${orderId}&accountName=${accountName}`;
    
    const modalHtml = `
        <div id="paymentQRModal" class="status-modal active" style="z-index: 10002;">
            <div class="status-modal-content" style="max-width: 400px; text-align: center; padding: 30px;">
                <h3 style="margin-bottom: 15px;">Quét mã để thanh toán</h3>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Vui lòng quét mã QR dưới đây để hoàn tất thanh toán cho đơn hàng <strong>#${orderId}</strong></p>
                <img src="${qrUrl}" alt="VietQR" style="width: 100%; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <div style="font-weight: 700; font-size: 20px; color: #2563eb; margin-bottom: 20px;">${amount.toLocaleString('vi-VN')}đ</div>
                <button onclick="document.getElementById('paymentQRModal').remove()" class="cart-submit-btn" style="width: 100%;">Tôi đã chuyển khoản</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function submitOrder() {
    const customerName = document.getElementById('customerName')?.value.trim();
    const customerPhone = document.getElementById('customerPhone')?.value.trim();
    const customerAddress = document.getElementById('customerAddress')?.value.trim();
    const deliveryTimeType = document.querySelector('input[name="deliveryTimeType"]:checked')?.value || 'asap';
    const deliveryTimeValue = document.getElementById('customerDeliveryTime')?.value || '';
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
    
    // Validate thông tin
    if (!customerName) {
        triggerModalShake();
        showToast('Vui lòng nhập họ và tên', 'error');
        document.getElementById('customerName')?.focus();
        return;
    }
    if (!customerPhone) {
        triggerModalShake();
        showToast('Vui lòng nhập số điện thoại', 'error');
        document.getElementById('customerPhone')?.focus();
        return;
    }
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phoneRegex.test(customerPhone.replace(/[^0-9]/g, ''))) {
        triggerModalShake();
        showToast('Số điện thoại không hợp lệ', 'error');
        document.getElementById('customerPhone')?.focus();
        return;
    }
    if (!customerAddress) {
        triggerModalShake();
        showToast('Vui lòng nhập địa chỉ giao hàng', 'error');
        document.getElementById('customerAddress')?.focus();
        return;
    }

    // Xử lý thời gian giao hàng (tuỳ chọn, vẫn lưu vào note hoặc bỏ qua)
    let deliverySchedule = {
        type: 'asap',
        label: 'Giao sớm nhất có thể'
    };
    if (deliveryTimeType === 'scheduled') {
        if (!deliveryTimeValue) {
            triggerModalShake();
            showToast('Vui lòng chọn thời gian giao hàng', 'error');
            document.getElementById('customerDeliveryTime')?.focus();
            return;
        }
        const selectedDeliveryDate = new Date(deliveryTimeValue);
        const earliestDeliveryDate = getEarliestDeliveryDate();
        if (Number.isNaN(selectedDeliveryDate.getTime()) || selectedDeliveryDate < earliestDeliveryDate) {
            triggerModalShake();
            showToast('Thời gian giao hàng phải sau ít nhất 30 phút kể từ hiện tại', 'error');
            document.getElementById('customerDeliveryTime')?.focus();
            return;
        }
        deliverySchedule = {
            type: 'scheduled',
            value: selectedDeliveryDate.toISOString(),
            label: selectedDeliveryDate.toLocaleString('vi-VN')
        };
    }
    
    showLoading(true);
    
    const total = calculateTotal();
    const shortId = Date.now().toString().slice(-6);
    const orderId = 'ORD_' + shortId;
    const currentDateTime = new Date().toISOString(); // orderDate
    

    const orderData = {
        customerName: customerName,
        customerPhone: customerPhone, 
        customerAddress: customerAddress,
        totalAmount: total,                    
        orderDate: currentDateTime,            
        status: 'pending',                    
        paymentMethod: paymentMethod,
        deliveryTime: deliverySchedule.type === 'scheduled' ? deliverySchedule.value : null,
        items: JSON.stringify(cart.map(item => {
        if (item.isCombo && item.comboItems) {
            // Tính lại số lượng mỗi món con = qtyPerCombo * item.quantity
            const comboItemsWithQuantity = item.comboItems.map(ci => ({
                ...ci,
                qtyPerCombo: ci.qtyPerCombo * item.quantity
            }));
            return {
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                isCombo: true,
                comboItems: comboItemsWithQuantity,
                note: item.note
            };
        } else {
            return {
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                isCombo: false
            };
        }
    }))                                   // trường bắt buộc (string/varchar)
    };
    
  
    try {
        const settings = await getSystemSettings();
        if (settings.acceptingOrders === false) {
            showToast('⏸️ Hệ thống đang tạm ngừng nhận đơn. Vui lòng quay lại sau.', 'error');
            showLoading(false);
            return;
        }
    } catch (e) {
     
    }

    try {
        await databases.createDocument(DATABASE_ID, 'orders', ID.unique(), orderData);

        cart = [];
        updateCartCount();
        saveCartToLocalStorage();

        const refreshTasks = [];
        if (typeof window.refreshDishesFromDb === 'function') {
            refreshTasks.push(window.refreshDishesFromDb());
        }
        if (typeof window.refreshMenuCombosFromDb === 'function') {
            refreshTasks.push(window.refreshMenuCombosFromDb());
        }

        const trackIcon = document.getElementById('openTrackModal');
        if (trackIcon) trackIcon.classList.add('pulse');

        showToast(`✅ Đặt hàng thành công! Mã đơn: ${orderId}`, 'success');

        if (paymentMethod === 'qr') {
            showQRModal(shortId, total);
        }

        // Reset form
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerAddress').value = '';
        if (document.getElementById('customerDeliveryTime')) {
            document.getElementById('customerDeliveryTime').value = formatDateTimeLocal(getEarliestDeliveryDate());
        }
        document.querySelector('input[name="deliveryTimeType"][value="asap"]')?.click();

        await Promise.all(refreshTasks).catch((error) => {
            console.warn('Không thể làm mới menu sau khi đặt hàng:', error);
        });

        backToCart();
        closeCartModal();
    } catch (error) {
        console.error('Lỗi khi lưu đơn hàng:', error);
        showToast('Đặt hàng thất bại: ' + (error.message || 'Vui lòng thử lại'), 'error');
    } finally {
        showLoading(false);
    }
}
// ========== MODAL CONTROL ==========

// Mở modal giỏ hàng
function openCartModal() {
    const modal = document.getElementById('cartModal');
    if (isOrdersPaused()) {
        showToast('⏸️ Hệ thống đang tạm ngừng nhận đơn. Vui lòng quay lại sau.', 'error');
        return;
    }
    if (modal) {
        if (isCheckoutMode) {
            backToCart();
        }
        renderCartItems();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Đóng modal giỏ hàng
function closeCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (isCheckoutMode) {
            backToCart();
        }
    }
}

// ========== SETUP EVENTS ==========

// Gắn sự kiện cho các nút
function setupCartEvents() {
    const cartIcon = document.querySelector('.shop-icon');
    const cartClose = document.getElementById('cartClose');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const backBtn = document.getElementById('backToCartBtn');
    const submitBtn = document.getElementById('submitOrderBtn');

    if (cartIcon) {
        cartIcon.removeEventListener('click', openCartModal);
        cartIcon.addEventListener('click', openCartModal);
    }

    if (cartClose) {
        cartClose.removeEventListener('click', closeCartModal);
        cartClose.addEventListener('click', closeCartModal);
    }

    if (checkoutBtn) {
        checkoutBtn.removeEventListener('click', showCheckoutForm);
        checkoutBtn.addEventListener('click', showCheckoutForm);
    }

    if (backBtn) {
        backBtn.removeEventListener('click', backToCart);
        backBtn.addEventListener('click', backToCart);
    }

    if (submitBtn) {
        submitBtn.removeEventListener('click', submitOrder);
        submitBtn.addEventListener('click', submitOrder);
    }

    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCartModal();
            }
        });
    }
}

// Khởi tạo
function initCart() {
    loadCartFromLocalStorage();
    setupCartEvents();
    console.log('Cart initialized with', cart.length, 'items');
}

// Chạy khi trang load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
} else {
    initCart();
}

// Export các hàm ra global
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.closeCartModal = closeCartModal;
window.openCartModal = openCartModal;
