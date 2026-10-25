const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const out = path.join(__dirname, '..', 'dist');
fs.mkdirSync(out, { recursive: true });

for (const f of ['index.html', 'styles.css', 'early.js']) {
  fs.copyFileSync(path.join(__dirname, '..', 'src', 'renderer', f), path.join(out, f));
}
fs.copyFileSync(path.join(__dirname, '..', 'assets', 'logo.svg'), path.join(out, 'logo.svg'));

// Skins (CSS) y la tipografía Inter del skin Mac (licencia SIL OFL; ver node_modules/@fontsource-variable/inter/LICENSE).
fs.mkdirSync(path.join(out, 'skins'), { recursive: true });
for (const f of fs.readdirSync(path.join(__dirname, '..', 'src', 'renderer', 'skins'))) {
  fs.copyFileSync(path.join(__dirname, '..', 'src', 'renderer', 'skins', f), path.join(out, 'skins', f));
}
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
fs.copyFileSync(
  path.join(__dirname, '..', 'node_modules', '@fontsource-variable', 'inter', 'files', 'inter-latin-wght-normal.woff2'),
  path.join(out, 'fonts', 'inter-latin-wght-normal.woff2'),
);

const options = {
  entryPoints: [path.join(__dirname, '..', 'src', 'renderer', 'main.js')],
  bundle: true,
  format: 'iife',
  outfile: path.join(out, 'renderer.js'),
  target: 'chrome130',
  sourcemap: true,
  logLevel: 'info',
};

(async () => {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  } else {
    await esbuild.build(options);
  }
})();
