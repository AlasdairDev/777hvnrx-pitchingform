const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// Default admin credentials (CHANGE THESE IN PRODUCTION!)
const DEFAULT_ADMIN = {
    username: 'admin',
    // Password: 'admin123' (hashed)
    passwordHash: '$2b$10$rKZN6yVF5VyVQ5xGxW5wOewJyKGQTZZJ5FqKKqJFY9xQQKJmVFQKS'
};

class Admin {
    static initialize() {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        
        // Create admin.json if it doesn't exist
        if (!fs.existsSync(ADMIN_FILE)) {
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(DEFAULT_ADMIN, null, 2));
        }
    }

    static getAdmin() {
        this.initialize();
        const data = fs.readFileSync(ADMIN_FILE, 'utf8');
        return JSON.parse(data);
    }

    static async verify(username, password) {
        try {
            const admin = this.getAdmin();
            
            if (username !== admin.username) {
                return false;
            }
            
            return await bcrypt.compare(password, admin.passwordHash);
        } catch (error) {
            console.error('Error verifying admin credentials:', error);
            return false;
        }
    }

    static async updatePassword(newPassword) {
        try {
            const admin = this.getAdmin();
            const hash = await bcrypt.hash(newPassword, 10);
            
            admin.passwordHash = hash;
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
            
            return true;
        } catch (error) {
            console.error('Error updating password:', error);
            return false;
        }
    }
}

module.exports = Admin;