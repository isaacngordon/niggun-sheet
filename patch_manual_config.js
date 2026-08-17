import fs from "fs";
let content = fs.readFileSync("app/sheet-builder-v2/SheetBuilderApp.tsx", "utf-8");
content = content.replace(/  const manualConfig = useMemo\(\(\) => \{\n    return resolveManualOverflowConfig\(\n      \{ cols: manualColumns, fontSize: manualFontSize \},\n      sheetSongs,\n      measurements,\n      showTitles,\n      showOrderNumbers,\n    \);\n  \}, \[manualColumns, manualFontSize, measurements, sheetSongs, showOrderNumbers, showTitles\]\);/g, `  const manualConfig = useMemo(() => {
    const fontSize = isBencherMode ? (isBuzzerBeater ? 10 : 11) : manualFontSize;
    return resolveManualOverflowConfig(
      { cols: manualColumns, fontSize },
      sheetSongs,
      measurements,
      showTitles,
      showOrderNumbers,
    );
  }, [isBencherMode, isBuzzerBeater, manualColumns, manualFontSize, measurements, sheetSongs, showOrderNumbers, showTitles]);`);
fs.writeFileSync("app/sheet-builder-v2/SheetBuilderApp.tsx", content);
