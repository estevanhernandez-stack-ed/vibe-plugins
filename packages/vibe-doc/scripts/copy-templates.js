const fs = require('fs');
const path = require('path');
const glob = require('fast-glob');

async function copyTemplates() {
  try {
    // Resolve paths relative to the package root
    const srcDir = path.join(__dirname, '..', 'src', 'templates', 'embedded');
    const distDir = path.join(__dirname, '..', 'dist', 'templates', 'embedded');

    // Create dist/templates/embedded directory if it doesn't exist
    fs.mkdirSync(distDir, { recursive: true });

    // Read all .md files from src/templates/embedded/
    // fast-glob requires forward slashes on all platforms, so normalize
    // from any native path form before passing to the matcher.
    const globPattern = path.join(srcDir, '*.md').replace(/\\/g, '/');
    const templateFiles = await glob(globPattern);

    if (templateFiles.length === 0) {
      console.log('No template files found to copy.');
      return;
    }

    // Copy each file
    templateFiles.forEach((srcFile) => {
      const fileName = path.basename(srcFile);
      const destFile = path.join(distDir, fileName);

      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied: ${fileName}`);
    });

    console.log(`Successfully copied ${templateFiles.length} template file(s).`);
  } catch (error) {
    console.error('Error copying templates:', error.message);
    process.exit(1);
  }
}

copyTemplates();
