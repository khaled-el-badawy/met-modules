const fs = require('fs');
const path = require('path');

const rootDir = process.env.CWD || __dirname;
const ignoreFiles = ['policy.html', 'node_modules', '.git'];

function removeEmojisFromFile(filePath) {
  const ext = path.extname(filePath);
  if (ext !== '.html' && ext !== '.js' && ext !== '.css') return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  
  const newContent = content.replace(emojiRegex, (match) => {
    // Keep 📚
    if (match === '📚') return match;
    // Wait, are there any other emojis we want to keep?
    // Maybe keep standard punctuation that gets matched sometimes if not careful
    if (match.length === 1 && match.charCodeAt(0) < 255) return match;
    return '';
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

function traverseDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    if (ignoreFiles.includes(file)) continue;
    
    const fullPath = path.join(currentPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      traverseDir(fullPath);
    } else {
      removeEmojisFromFile(fullPath);
    }
  }
}

traverseDir(rootDir);
