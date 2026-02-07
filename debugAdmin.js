// Complete Admin Login Debug Script
// Run with: node debugAdmin.js

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('ADMIN LOGIN DEBUG SCRIPT');
console.log('========================================\n');

// Check 1: Find admin.json file
console.log('1. CHECKING FOR admin.json FILE');
console.log('----------------------------------------');

const possiblePaths = [
    path.join(__dirname, 'data', 'admin.json'),
    path.join(__dirname, 'config', 'admin.json'),
    path.join(__dirname, '..', 'data', 'admin.json'),
    path.join(__dirname, '..', 'config', 'admin.json'),
];

let adminFilePath = null;
let adminData = null;

for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
        console.log(`✓ FOUND: ${filePath}`);
        adminFilePath = filePath;
        adminData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        break;
    } else {
        console.log(`✗ Not found: ${filePath}`);
    }
}

if (!adminFilePath) {
    console.log('\n❌ ERROR: admin.json not found in any location!');
    console.log('\nCreate it in one of these locations:');
    possiblePaths.forEach(p => console.log(`  - ${p}`));
    process.exit(1);
}

console.log('\n2. ADMIN.JSON CONTENTS');
console.log('----------------------------------------');
console.log('Username:', adminData.username);
console.log('Password Hash:', adminData.passwordHash);

// Check 2: Test password verification
console.log('\n3. TESTING PASSWORD VERIFICATION');
console.log('----------------------------------------');

async function testPasswords() {
    const testCases = [
        'admin123',
        'admin',
        'Admin123',
        'password',
        '123456'
    ];
    
    for (const password of testCases) {
        const isValid = await bcrypt.compare(password, adminData.passwordHash);
        const status = isValid ? '✓ VALID' : '✗ Invalid';
        console.log(`${status} - "${password}"`);
        
        if (isValid) {
            console.log(`\n✓✓✓ SUCCESS! The password is: "${password}"`);
        }
    }
}

testPasswords().then(() => {
    console.log('\n4. CHECKING BCRYPT INSTALLATION');
    console.log('----------------------------------------');
    try {
        const bcryptVersion = require('bcrypt/package.json').version;
        console.log('✓ bcrypt version:', bcryptVersion);
    } catch (e) {
        console.log('✗ bcrypt not found, checking bcryptjs...');
        try {
            const bcryptjsVersion = require('bcryptjs/package.json').version;
            console.log('✓ bcryptjs version:', bcryptjsVersion);
            console.log('⚠ WARNING: You are using bcryptjs, not bcrypt!');
            console.log('  Hash may have been created with different library.');
        } catch (e2) {
            console.log('❌ Neither bcrypt nor bcryptjs found!');
        }
    }
    
    console.log('\n5. GENERATING NEW HASH (if needed)');
    console.log('----------------------------------------');
    
    async function generateNewHash() {
        const newPassword = 'admin123';
        const newHash = await bcrypt.hash(newPassword, 10);
        
        console.log('\nIf nothing worked, use this fresh hash:');
        console.log('Password:', newPassword);
        console.log('New Hash:', newHash);
        console.log('\nReplace in admin.json:');
        console.log(JSON.stringify({
            username: adminData.username,
            passwordHash: newHash
        }, null, 2));
    }
    
    generateNewHash();
    
    console.log('\n6. CHECKING SESSION CONFIGURATION');
    console.log('----------------------------------------');
    console.log('Check your server.js or app.js for:');
    console.log('  - express-session middleware installed');
    console.log('  - session secret configured');
    console.log('  - session cookie settings');
    
    console.log('\n========================================');
    console.log('DEBUG COMPLETE');
    console.log('========================================\n');
});
