const fs = require('fs');

let content = fs.readFileSync('app/sheet-builder-v2/SheetBuilderApp.tsx', 'utf8');

const regex = /<div className="sb2-sheet-browser-modal">\s+<div className="sb2-sheet-browser-header">\s+<div>\s+<h2>Saved Sheets<\/h2>\s+<p>Point to a sheet name to preview it\. Click it to open it\.<\/p>\s+<\/div>\s+<button className="sb2-sheet-browser-close" onClick=\{handleCloseSavedSheetsModal\} aria-label="Close saved sheets">×<\/button>\s+<\/div>/;

const newString = `<div className="sb2-sheet-browser-modal">
              <div className="sb2-sheet-browser-header sb2-utility-bar">
                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: '12px' }}>
                  <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Saved Sheets</h2>
                  <div className="sb2-utility-divider" style={{ margin: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Point to a sheet name to preview it. Click it to open it.</p>
                </div>
                <button className="sb2-icon-btn sb2-sheet-browser-close" onClick={handleCloseSavedSheetsModal} aria-label="Close saved sheets">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, newString);
  fs.writeFileSync('app/sheet-builder-v2/SheetBuilderApp.tsx', content, 'utf8');
  console.log("Successfully replaced string");
} else {
  console.log("String not found");
}
