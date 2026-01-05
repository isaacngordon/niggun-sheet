const fs = require('fs');
const csv = require('csv-parser');

let count = 0;
let errors = [];

fs.createReadStream('data/songs.csv')
  .pipe(csv())
  .on('data', (row) => {
    count++;
    if (!row.Title || !row.lyrics) {
      errors.push(`Row ${count}: Missing title or lyrics`);
    }
  })
  .on('end', () => {
    console.log(`✓ Parsed ${count} songs successfully`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    } else {
      console.log('✓ No parsing errors');
    }
  })
  .on('error', (err) => {
    console.error('✗ Error:', err);
  });
