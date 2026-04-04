const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Handle className="..."
  const classNameRegex = /className=(["'])(.*?)\1/g;
  let updatedContent = content.replace(classNameRegex, (match, quote, classes) => {
    const classList = classes.split(/\s+/).filter(Boolean);
    const hasTransition = classList.some(c => c.startsWith('transition-') && c !== 'transition-none');
    const hasDuration = classList.some(c => c.startsWith('duration-'));
    const hasEase = classList.some(c => c.startsWith('ease-'));
    
    if (hasTransition) {
      if (!hasDuration) classList.push('duration-300');
      if (!hasEase) classList.push('ease-in-out');
    }
    
    return `className=${quote}${classList.join(' ')}${quote}`;
  });
  
  // Handle className={`...`}
  const templateRegex = /className=\{`([^`]+)`\}/g;
  updatedContent = updatedContent.replace(templateRegex, (match, classes) => {
    const hasTransition = classes.includes('transition-') && !classes.includes('transition-none');
    const hasDuration = classes.includes('duration-');
    const hasEase = classes.includes('ease-');
    
    let newClasses = classes;
    if (hasTransition) {
      if (!hasDuration) newClasses += ' duration-300';
      if (!hasEase) newClasses += ' ease-in-out';
    }
    return `className={\`${newClasses}\`}`;
  });

  if (content !== updatedContent) {
    fs.writeFileSync(file, updatedContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
