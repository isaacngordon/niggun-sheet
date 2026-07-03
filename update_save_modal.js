const fs = require('fs');

let content = fs.readFileSync('app/sheet-builder-v2/SheetBuilderApp.tsx', 'utf8');

const regex = /\{showSaveSheetModal && \(\s*<div className="sb2-sheet-browser-backdrop" onClick=\{\(event\) => \{\s*if \(event\.target === event\.currentTarget\) \{\s*setShowSaveSheetModal\(false\);\s*\}\s*\}\}>\s*<form\s*className="sb2-overwrite-modal sb2-save-modal"/;

const newString = `{showSaveSheetModal && (
          <div className="sb2-sheet-browser-backdrop" onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowSaveSheetModal(false);
            }
          }}>
            <form
              className="sb2-overwrite-modal sb2-save-modal"`;

if (regex.test(content)) {
  console.log("Found");
} else {
  console.log("NOT Found");
}


