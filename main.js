const fs = require('fs');
const path = require('path');

function tryRequire(relPath) {
  const full = path.join(process.cwd(), relPath);
  if (fs.existsSync(full)) {
    console.log(`Requiring ${relPath} ...`);
    require(full);
    return true;
  }
  return false;
}

(async () => {
  try {
    // Prefer package.json "main" if present
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.main && tryRequire(pkg.main)) return;
      // If there is a bin, try those too
      if (pkg.bin) {
        const bins = Array.isArray(pkg.bin) ? pkg.bin : Object.values(pkg.bin);
        for (const b of bins) {
          if (tryRequire(b)) return;
        }
      }
    }

    // Common candidate entry files
    const candidates = [
      'index.js',
      'app.js',
      'server.js',
      'src/index.js',
      'lib/index.js',
      'dist/index.js'
    ];
    for (const c of candidates) {
      if (tryRequire(c)) return;
    }

    // Nothing found — help the user
    console.error('');
    console.error('No application entry was found. To fix this, either:');
    console.error('  1) Rename your main source file to "main.js",');
    console.error('  2) Set "main" in package.json to point to your entry file, or');
    console.error('  3) Provide a Dockerfile that runs your custom start command.');
    console.error('');
    console.error('Files in repository root:');
    const files = fs.readdirSync(process.cwd());
    files.forEach(f => console.error('  -', f));
    process.exit(1);
  } catch (err) {
    console.error('Error while attempting to start the repository entry point:', err);
    process.exit(1);
  }
})();
