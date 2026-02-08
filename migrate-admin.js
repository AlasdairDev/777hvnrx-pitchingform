// Migration Script: Convert old admin.json to new admins.json format
// Run this once to migrate from single admin to multi-admin system

const fs = require('fs');
const path = require('path');

const OLD_ADMIN_FILE = path.join(__dirname, 'data', 'admin.json');
const NEW_ADMIN_FILE = path.join(__dirname, 'data', 'admins.json');

async function migrateAdmin() {
    console.log('🔄 Starting admin migration...\n');

    // Check if old admin.json exists
    if (!fs.existsSync(OLD_ADMIN_FILE)) {
        console.log('❌ Old admin.json not found at:', OLD_ADMIN_FILE);
        console.log('💡 Creating new admins.json with default admin...\n');
        createDefaultAdmin();
        return;
    }

    // Check if new admins.json already exists
    if (fs.existsSync(NEW_ADMIN_FILE)) {
        console.log('⚠️  Warning: admins.json already exists!');
        console.log('📁 Location:', NEW_ADMIN_FILE);
        
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        readline.question('Do you want to overwrite it? (yes/no): ', (answer) => {
            readline.close();
            if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                performMigration();
            } else {
                console.log('\n❌ Migration cancelled. Existing admins.json preserved.');
            }
        });
    } else {
        performMigration();
    }
}

function performMigration() {
    try {
        // Read old admin.json
        const oldAdminData = JSON.parse(fs.readFileSync(OLD_ADMIN_FILE, 'utf8'));
        console.log('✅ Read old admin.json');
        console.log('   Username:', oldAdminData.username);

        // Create new admin object in multi-admin format
        const newAdmin = {
            id: '1',
            username: oldAdminData.username,
            email: 'admin@777heaven.com', // Default email, change after migration
            passwordHash: oldAdminData.passwordHash,
            role: 'super_admin', // Make the existing admin a super admin
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };

        // Create array with the migrated admin
        const admins = [newAdmin];

        // Ensure data directory exists
        const dataDir = path.dirname(NEW_ADMIN_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write new admins.json
        fs.writeFileSync(NEW_ADMIN_FILE, JSON.stringify(admins, null, 2));
        console.log('✅ Created new admins.json');
        console.log('   Location:', NEW_ADMIN_FILE);

        // Backup old admin.json
        const backupFile = OLD_ADMIN_FILE + '.backup';
        fs.copyFileSync(OLD_ADMIN_FILE, backupFile);
        console.log('✅ Backed up old admin.json to:', backupFile);

        console.log('\n' + '='.repeat(60));
        console.log('✅ MIGRATION SUCCESSFUL!');
        console.log('='.repeat(60));
        console.log('\nMigrated Admin Details:');
        console.log('  Username:', newAdmin.username);
        console.log('  Email:', newAdmin.email, '(⚠️  UPDATE THIS!)');
        console.log('  Role:', newAdmin.role);
        console.log('  Status:', newAdmin.isActive ? 'Active' : 'Inactive');
        console.log('\n⚠️  IMPORTANT NEXT STEPS:');
        console.log('  1. Update the email address in admins.json');
        console.log('  2. Login and change your password');
        console.log('  3. Delete or archive the old admin.json.backup');
        console.log('  4. Restart your server');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nPlease check:');
        console.error('  1. admin.json exists and is valid JSON');
        console.error('  2. You have write permissions to the data folder');
        console.error('  3. The data folder exists');
    }
}

function createDefaultAdmin() {
    try {
        const defaultAdmin = {
            id: '1',
            username: 'admin',
            email: 'admin@777heaven.com',
            // Password: 'Admin@777!' (hashed)
            passwordHash: '$2b$10$rKZN6yVF5VyVQ5xGxW5wOewJyKGQTZZJ5FqKKqJFY9xQQKJmVFQKS',
            role: 'super_admin',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };

        const admins = [defaultAdmin];

        // Ensure data directory exists
        const dataDir = path.dirname(NEW_ADMIN_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write new admins.json
        fs.writeFileSync(NEW_ADMIN_FILE, JSON.stringify(admins, null, 2));

        console.log('✅ Created new admins.json with default admin');
        console.log('   Location:', NEW_ADMIN_FILE);
        console.log('\nDefault Admin Credentials:');
        console.log('  Username: admin');
        console.log('  Password: Admin@777!');
        console.log('\n⚠️  CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!\n');

    } catch (error) {
        console.error('❌ Failed to create default admin:', error.message);
    }
}

// Run migration
migrateAdmin();
