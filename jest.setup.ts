// Polyfill TextEncoder/TextDecoder for jsdom (needed by jsPDF dependencies)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
