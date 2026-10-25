const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const out = path.join(__dirname, '..', 'dist');
fs.mkdirSync(out, { recursive: true });

for (const f of ['index.html', 'styles.css']) {
  fs.copyFileSync(path.join(__dirname, '..', 'src', 'renderer', f), path.join(out, f));
}

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
