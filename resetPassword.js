// Simple Password Reset
// Run with: node resetPassword.js

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function resetPassword() {
    console.log('\n========================================');
    console.log('PASSWORD RESET TOOL');
    console.log('========================================\n');
    
    // The new password you want to set
    const newPassword = 'admin123';  // CHANGE THIS if you want a different password
    
    console.log('Generating hash for password:', newPassword);
    const newHash = await bcrypt.hash(newPassword, 10);
    
    const adminData = {
        username: 'admin',
        passwordHash: newHash
    };
    
    // Try to write to data/admin.json
    const dataPath = path.join(__dirname, 'data', 'admin.json');
    const configPath = path.join(__dirname, 'config', 'admin.json');
    
    try {
        // Create directories if they don't exist
        if (!fs.existsSync(path.join(__dirname, 'data'))) {
            fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
        }
        
        // Write to data/admin.json
        fs.writeFileSync(dataPath, JSON.stringify(adminData, null, 2));
        console.log('\n✓ Created/Updated:', dataPath);
        
        // Also write to config/admin.json for backup
        if (!fs.existsSync(path.join(__dirname, 'config'))) {
            fs.mkdirSync(path.join(__dirname, 'config'), { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(adminData, null, 2));
        console.log('✓ Created/Updated:', configPath);
        
        console.log('\n========================================');
        console.log('NEW CREDENTIALS:');
        console.log('========================================');
        console.log('Username:', adminData.username);
        console.log('Password:', newPassword);
        console.log('\nHash:', newHash);
        console.log('========================================\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\nManually create data/admin.json with:');
        console.log(JSON.stringify(adminData, null, 2));
    }
}

resetPassword();
