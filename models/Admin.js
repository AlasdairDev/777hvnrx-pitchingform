const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const ADMIN_FILE = path.join(DATA_DIR, 'admins.json');

// Default admin credentials (CHANGE THESE IN PRODUCTION!)
const DEFAULT_ADMINS = [
    {
        id: '1',
        username: 'admin',
        email: 'admin@777heaven.com',
        // Password: 'Admin@777!' (hashed)
        passwordHash: '$2b$10$rKZN6yVF5VyVQ5xGxW5wOewJyKGQTZZJ5FqKKqJFY9xQQKJmVFQKS',
        role: 'super_admin', // super_admin, admin, moderator
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true
    }
];

class Admin {
    static initialize() {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        
        // Create admins.json if it doesn't exist
        if (!fs.existsSync(ADMIN_FILE)) {
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(DEFAULT_ADMINS, null, 2));
        }
    }

    static getAdmins() {
        this.initialize();
        const data = fs.readFileSync(ADMIN_FILE, 'utf8');
        return JSON.parse(data);
    }

    static getAdminByUsername(username) {
        const admins = this.getAdmins();
        return admins.find(admin => admin.username === username);
    }

    static getAdminById(id) {
        const admins = this.getAdmins();
        return admins.find(admin => admin.id === id);
    }

    static async verify(username, password) {
        try {
            const admin = this.getAdminByUsername(username);
            
            if (!admin || !admin.isActive) {
                return false;
            }
            
            const isValid = await bcrypt.compare(password, admin.passwordHash);
            
            if (isValid) {
                // Update last login
                this.updateLastLogin(admin.id);
                return admin;
            }
            
            return false;
        } catch (error) {
            console.error('Error verifying admin credentials:', error);
            return false;
        }
    }

    static updateLastLogin(adminId) {
        const admins = this.getAdmins();
        const admin = admins.find(a => a.id === adminId);
        
        if (admin) {
            admin.lastLogin = new Date().toISOString();
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2));
        }
    }

    static async createAdmin(data) {
        try {
            const admins = this.getAdmins();
            
            // Check if username already exists
            if (admins.find(a => a.username === data.username)) {
                throw new Error('Username already exists');
            }

            // Check if email already exists
            if (admins.find(a => a.email === data.email)) {
                throw new Error('Email already exists');
            }
            
            const hash = await bcrypt.hash(data.password, 10);
            
            const newAdmin = {
                id: Date.now().toString(),
                username: data.username,
                email: data.email,
                passwordHash: hash,
                role: data.role || 'moderator',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };
            
            admins.push(newAdmin);
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2));
            
            return { success: true, admin: newAdmin };
        } catch (error) {
            console.error('Error creating admin:', error);
            return { success: false, error: error.message };
        }
    }

    static async updatePassword(adminId, newPassword) {
        try {
            const admins = this.getAdmins();
            const admin = admins.find(a => a.id === adminId);
            
            if (!admin) {
                return { success: false, error: 'Admin not found' };
            }
            
            const hash = await bcrypt.hash(newPassword, 10);
            admin.passwordHash = hash;
            
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2));
            
            return { success: true };
        } catch (error) {
            console.error('Error updating password:', error);
            return { success: false, error: error.message };
        }
    }

    static updateAdmin(adminId, updates) {
        try {
            const admins = this.getAdmins();
            const adminIndex = admins.findIndex(a => a.id === adminId);
            
            if (adminIndex === -1) {
                return { success: false, error: 'Admin not found' };
            }
            
            // Don't allow updating password through this method
            delete updates.passwordHash;
            delete updates.id;
            
            admins[adminIndex] = { ...admins[adminIndex], ...updates };
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2));
            
            return { success: true, admin: admins[adminIndex] };
        } catch (error) {
            console.error('Error updating admin:', error);
            return { success: false, error: error.message };
        }
    }

    static deleteAdmin(adminId, currentAdminId) {
        try {
            const admins = this.getAdmins();
            
            // Don't allow deleting yourself
            if (adminId === currentAdminId) {
                return { success: false, error: 'Cannot delete your own account' };
            }
            
            // Don't allow deleting the last super admin
            const superAdmins = admins.filter(a => a.role === 'super_admin');
            const targetAdmin = admins.find(a => a.id === adminId);
            
            if (targetAdmin.role === 'super_admin' && superAdmins.length === 1) {
                return { success: false, error: 'Cannot delete the last super admin' };
            }
            
            const filtered = admins.filter(a => a.id !== adminId);
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(filtered, null, 2));
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting admin:', error);
            return { success: false, error: error.message };
        }
    }

    static toggleActive(adminId) {
        try {
            const admins = this.getAdmins();
            const admin = admins.find(a => a.id === adminId);
            
            if (!admin) {
                return { success: false, error: 'Admin not found' };
            }
            
            admin.isActive = !admin.isActive;
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2));
            
            return { success: true, admin };
        } catch (error) {
            console.error('Error toggling admin status:', error);
            return { success: false, error: error.message };
        }
    }

    static hasPermission(admin, action) {
        const permissions = {
            super_admin: ['view', 'create', 'edit', 'delete', 'archive', 'export', 'manage_admins'],
            admin: ['view', 'create', 'edit', 'archive', 'export'],
            moderator: ['view', 'archive']
        };
        
        return permissions[admin.role]?.includes(action) || false;
    }

    static getStats() {
        const admins = this.getAdmins();
        
        return {
            total: admins.length,
            active: admins.filter(a => a.isActive).length,
            inactive: admins.filter(a => !a.isActive).length,
            byRole: {
                super_admin: admins.filter(a => a.role === 'super_admin').length,
                admin: admins.filter(a => a.role === 'admin').length,
                moderator: admins.filter(a => a.role === 'moderator').length
            }
        };
    }
}

module.exports = Admin;
