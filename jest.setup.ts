// Polyfill TextEncoder/TextDecoder for jsdom without shadowing global names.
const nodeUtil = require('util');

if (typeof global.TextEncoder === 'undefined') {
	global.TextEncoder = nodeUtil.TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
	global.TextDecoder = nodeUtil.TextDecoder;
}
