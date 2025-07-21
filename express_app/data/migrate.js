const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'db.db');
const migrationDir = path.join(__dirname, 'migrations');

// Get all .sql files in the migration directory
const sqlFiles = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql'));

// Sort the files based on the number at the beginning of each file name
sqlFiles.sort((a, b) => {
    const aNumber = parseInt(a.match(/^\d+/)[0]);
    const bNumber = parseInt(b.match(/^\d+/)[0]);
    return aNumber - bNumber;
});

// Create a new SQLite database connection
const db = new sqlite3.Database(dbPath);

// Run each SQL file in sequence
sqlFiles.forEach(file => {
    const filePath = path.join(migrationDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    db.exec(sql, err => {
        if (err) {
            console.error(`Error running migration ${file}: ${err}`);
        } else {
            console.log(`Migration ${file} executed successfully`);
        }
    });
});

// Close the database connection
db.close();