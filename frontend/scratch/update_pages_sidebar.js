const fs = require('fs');
const path = require('path');

const pagesDir = 'd:/Testfolderrootments/RootfinProduction-main/frontend/src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let modifiedCount = 0;

files.forEach(filename => {
  const filePath = path.join(pagesDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip Login.jsx or non-page files if needed
  if (filename === 'Login.jsx' || filename.includes('__tests__')) return;

  // Check if file contains top level ml margin classes (ml-64, ml-[240px], ml-[290px])
  const mlRegex = /className=(?:["']([^"']*ml-(?:64|\[240px\]|\[290px\]|56|72)[^"']*)["']|{`([^`]*ml-(?:64|\[240px\]|\[290px\]|56|72)[^`]*)`})/g;

  if (!mlRegex.test(content)) {
    return;
  }

  let fileChanged = false;

  // 1. Add import useSidebar if missing
  if (!content.includes('useSidebar')) {
    // Find last import statement
    const importMatches = [...content.matchAll(/^import\s+.*$/gm)];
    if (importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1];
      const insertPos = lastImport.index + lastImport[0].length;
      content = content.slice(0, insertPos) + '\nimport useSidebar from "../hooks/useSidebar";' + content.slice(insertPos);
      fileChanged = true;
    }
  }

  // 2. Add const isSidebarOpen = useSidebar(); inside component
  if (!content.includes('isSidebarOpen')) {
    // Find component declaration like `const ComponentName = ... => {` or `function ComponentName(...) {`
    const compRegex = /(?:const|function)\s+([A-Za-z0-9_]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>\s*{|(?:function)\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*{/g;
    const match = compRegex.exec(content);
    if (match) {
      const insertPos = match.index + match[0].length;
      content = content.slice(0, insertPos) + '\n  const isSidebarOpen = useSidebar();' + content.slice(insertPos);
      fileChanged = true;
    }
  }

  // 3. Replace static ml-64 / ml-[240px] / ml-[290px] in classNames with dynamic isSidebarOpen check
  // Replace static strings className="... ml-64 ..." -> className={`... transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} ...`}
  content = content.replace(/className="([^"]*?\b(ml-64|ml-\[240px\]|ml-\[290px\])\b[^"]*?)"/g, (match, classStr, mlClass) => {
    fileChanged = true;
    const cleanClassStr = classStr.replace(mlClass, '').replace(/\s+/g, ' ').trim();
    const transitionStr = cleanClassStr.includes('transition') ? '' : 'transition-all duration-300 ';
    return `className={\`${transitionStr}${cleanClassStr} \${isSidebarOpen ? '${mlClass}' : 'ml-0'}\`}`;
  });

  // Also replace template literals where ml-64 is hardcoded without isSidebarOpen
  content = content.replace(/className={`([^`]*?\b(ml-64|ml-\[240px\]|ml-\[290px\])\b[^`]*?)`}/g, (match, classStr, mlClass) => {
    if (classStr.includes('isSidebarOpen')) return match; // already transformed
    fileChanged = true;
    const cleanClassStr = classStr.replace(mlClass, '').replace(/\s+/g, ' ').trim();
    const transitionStr = cleanClassStr.includes('transition') ? '' : 'transition-all duration-300 ';
    return `className={\`${transitionStr}${cleanClassStr} \${isSidebarOpen ? '${mlClass}' : 'ml-0'}\`}`;
  });

  if (fileChanged) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Updated: ${filename}`);
  }
});

console.log(`Successfully updated ${modifiedCount} files.`);
