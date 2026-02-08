// Simple Password Hash Generator
// Run this in your project directory: node generateHash.js

const bcrypt = require('bcrypt');

const password = 'Admin@777!'; // Change this to your desired password

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    console.log('\n=== New Admin Credentials ===');
    console.log('Username: admin');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\n=== Updated admins.json ===');
    console.log(JSON.stringify([
        {
            "id": "1",
            "username": "admin",
            "email": "admin@777heaven.com",
            "passwordHash": hash,
            "role": "super_admin",
            "createdAt": new Date().toISOString(),
            "lastLogin": null,
            "isActive": true
        }
    ], null, 2));
    console.log('\nCopy the above JSON and replace the content of data/admins.json');
});
