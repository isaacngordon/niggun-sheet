const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db.db', (err) => {
  if (err) {
    console.error('Error opening database ' + err.message);
  } else {
    console.log('Database connected!');
  }
});

// Helper function to run SQL queries with async/await
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
          if (err) {
              return reject(err);
          }
          resolve(this.lastID || null);
      });
  });
}

// Helper function to get a single row with async/await
function getRow(query, params = []) {
  return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
          if (err) {
              return reject(err);
          }
          resolve(row);
      });
  });
}


// export the database connection
module.exports = {db, runQuery, getRow};