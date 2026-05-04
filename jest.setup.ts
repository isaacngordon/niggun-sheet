// Polyfill TextEncoder/TextDecoder for jsdom without shadowing global names.
const nodeUtil = require('util');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (typeof global.TextEncoder === 'undefined') {
	global.TextEncoder = nodeUtil.TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
	global.TextDecoder = nodeUtil.TextDecoder;
}
