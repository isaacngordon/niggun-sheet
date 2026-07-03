const fs = require('fs');

let content = fs.readFileSync('app/sheet-builder-v2/SheetBuilderApp.tsx', 'utf8');

const regex = /<div className="sb2-overwrite-modal-header">\s*<h2>Save Sheet<\/h2>\s*<p>Enter a name for your sheet\.<\/p>\s*<\/div>/;

const newString = `<div className="sb2-sheet-browser-header sb2-utility-bar">
                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: '12px' }}>
                  <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Save Sheet</h2>
                  <div className="sb2-utility-divider" style={{ margin: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Enter a name for your sheet.</p>
                </div>
                <button type="button" className="sb2-icon-btn sb2-sheet-browser-close" onClick={() => setShowSaveSheetModal(false)} aria-label="Close save dialog">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, newString);
  const regex2 = /<div className="sb2-overwrite-modal-footer">\s*<button type="button" onClick=\{\(\) => setShowSaveSheetModal\(false\)\}>Cancel<\/button>\s*<button type="submit" className="sb2-overwrite-confirm-btn" disabled=\{\!saveDraftSheetTitle\.trim\(\)\}>\s*Save\s*<\/button>\s*<\/div>/;
  
  const footerString = `<div className="sb2-overwrite-modal-footer">
                <button type="submit" className="sb2-overwrite-confirm-btn" disabled={!saveDraftSheetTitle.trim()}>
                  Save
                </button>
              </div>`;
  content = content.replace(regex2, footerString);
  
  fs.writeFileSync('app/sheet-builder-v2/SheetBuilderApp.tsx', content, 'utf8');
  console.log("Successfully replaced string");
} else {
  console.log("NOT Found");
}

