// js/appwrite.js - Cấu hình Appwrite cho HTML thuần

// Khởi tạo Appwrite client
const client = new Appwrite.Client();

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')  // Từ .env.example
    .setProject('69eb91050034ff637921');               // Từ .env.example

// Khởi tạo các service
const databases = new Appwrite.Databases(client);
const account = new Appwrite.Account(client);

// Expose globally for non-module scripts and cross-module access
window.databases = databases;
window.account = account;
window.appwriteClient = client;

console.log('✅ Appwrite ready!');
