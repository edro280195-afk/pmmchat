const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.ts') && !file.includes('.spec.') && !file.includes('.config.') && !file.includes('.routes.')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Only process files with @Component
      if (!content.includes('@Component')) continue;
      
      if (content.includes('ChangeDetectionStrategy.OnPush')) continue;

      // Add import
      if (!content.includes('ChangeDetectionStrategy')) {
        const importRegex = /import\s+{([^}]+)}\s+from\s+['"]@angular\/core['"];/;
        const match = content.match(importRegex);
        if (match) {
          content = content.replace(importRegex, `import { $1, ChangeDetectionStrategy } from '@angular/core';`);
        } else {
          content = `import { ChangeDetectionStrategy } from '@angular/core';\n` + content;
        }
      }

      // Add changeDetection
      const componentRegex = /@Component\s*\(\s*{([^}]*)}\s*\)/;
      const match = content.match(componentRegex);
      if (match) {
        let inside = match[1];
        if (!inside.includes('changeDetection')) {
            // Check if there's a trailing comma
            if (!inside.trim().endsWith(',')) {
                inside += ',';
            }
            inside += '\n  changeDetection: ChangeDetectionStrategy.OnPush';
            content = content.replace(componentRegex, `@Component({${inside}\n})`);
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Updated ${fullPath}`);
        }
      }
    }
  }
}

processDir(path.join(__dirname, 'src/app'));
