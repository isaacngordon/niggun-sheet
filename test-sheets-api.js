require('dotenv').config();
const https = require('https');

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A:F';

console.log('Testing Google Sheets API connection...\n');
console.log('Configuration:');
console.log('- Sheet ID:', GOOGLE_SHEETS_ID);
console.log('- API Key:', GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 10)}...` : 'Not set');
console.log('- Range:', SHEET_RANGE);
console.log('\n');

// Test URL
const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${SHEET_RANGE}?key=${GOOGLE_API_KEY}`;
console.log('Test URL (open in browser to test):', testUrl.replace(GOOGLE_API_KEY, 'YOUR_API_KEY'));
console.log('\n');

// Make the request
https.get(testUrl, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Headers:', res.headers);
        
        try {
            const json = JSON.parse(data);
            if (res.statusCode === 200) {
                console.log('\n✅ SUCCESS! API is working');
                console.log('Number of rows:', json.values ? json.values.length : 0);
                if (json.values && json.values[0]) {
                    console.log('First row (headers):', json.values[0]);
                }
            } else {
                console.log('\n❌ ERROR:', res.statusCode);
                console.log('Error details:', JSON.stringify(json, null, 2));
                
                if (res.statusCode === 403) {
                    console.log('\nPossible issues:');
                    console.log('1. Google Sheets API not enabled in your project');
                    console.log('2. API key restrictions preventing access');
                    console.log('3. Sheet is not publicly accessible');
                }
                if (res.statusCode === 404) {
                    console.log('\nPossible issues:');
                    console.log('1. Sheet ID is incorrect');
                    console.log('2. Sheet range is incorrect');
                    console.log('3. Sheet doesn\'t exist or was deleted');
                }
                if (res.statusCode === 400) {
                    console.log('\nPossible issues:');
                    console.log('1. Invalid API key format');
                    console.log('2. Invalid range format');
                }
            }
        } catch (e) {
            console.log('Could not parse response:', data);
        }
    });
}).on('error', (err) => {
    console.error('Request error:', err);
});
