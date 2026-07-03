const text = "This is a test with {a link{https://google.com}} and {another{/songs}}";
const regex = /\{([^{}]+)\{([^}]+)\}\}/g;
let match;
while ((match = regex.exec(text)) !== null) {
  console.log("Match:", match[0]);
  console.log("Text:", match[1]);
  console.log("Link:", match[2]);
}
