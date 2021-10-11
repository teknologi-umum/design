const process = require('process');
const path = require('path');
const util = require('util');
const fsn = require('fs');
const fs = require('fs/promises');
const console = require('console');
const less = require('less');
const sass = require('sass');
const stylus = require('stylus');

const stylusRender = util.promisify(stylus.render)

;(async () => {
  try {
    console.log('🔵 Start compiling ./src into ./dist\n');
    fsn.stat(path.resolve(__dirname, './dist'), async (err) => {
      if (err && err.code === 'ENOENT') {
        return await fs.mkdir(path.resolve(__dirname, './dist'))
      }
      console.error('🔴 Please delete the ./dist folder yourself, then try again. The code for that is unbearable.');
      process.exit(1);
    })

    console.time('🟢 Done compiling in');

    const dirContent = await traverse('./src');

    for (const file of dirContent) {
      const outFile = './dist' + file.path.replace(/^\.\/src/i, '');
      Promise.allSettled([checkAndCreateDir(outFile)]);

      switch (file.ext) {
        case 'css': {
          Promise.allSettled([await fs.copyFile(path.resolve(__dirname, file.path), path.resolve(__dirname, outFile))]);
          console.log(`✅ ${file.path} -> ${outFile}`);
          break;
        }
        case 'styl': {
          const c = await fs.readFile(path.resolve(__dirname, file.path), { encoding: 'utf-8' });
          const css = await stylusRender(c);
          Promise.allSettled([await fs.writeFile(path.resolve(__dirname, outFile), css, { encoding: 'utf-8' })])          
          console.log(`✅ ${file.path} -> ${outFile}`);
          break;
        }
        case 'less': {
          const c = await fs.readFile(path.resolve(__dirname, file.path), { encoding: 'utf-8' });
          const css = await less.render(c, { paths: './src'});
          Promise.allSettled([fs.writeFile(path.resolve(__dirname, outFile), css.css, { encoding: 'utf-8' })])
          console.log(`✅ ${file.path} -> ${outFile}`);
          break;
        }
        case 'scss':
        case 'sass': {
          sass.render({ file: path.resolve(__dirname, file.path) }, async (err, css) => {
            if (err) throw err;
            Promise.allSettled([await fs.writeFile(path.resolve(__dirname, outFile), css.css, { encoding: 'utf-8' })]);
            console.log(`✅ ${file.path} -> ${outFile}`);
          });
          break;
        }
      }
    }
    console.log('\n');
    console.timeEnd('🟢 Done compiling in')
  } catch (error) {
    throw error
  }
})();

async function traverse(dirpath) {
  const dir = await fs.opendir(dirpath, { encoding: 'utf-8' });
  const r = [];
  for await (const dirent of dir) {
    if (dirent.isFile()) {
      r.push({ path: `${dirpath}/${dirent.name}`, ext: getExtension(dirent.name)});
    } else if (dirent.isDirectory()) {
      const v = await traverse(`${dirpath}/${dirent.name}`);
      r.push(...v);
    }
  }
  return r;
}

function getExtension(file) {
  const q = file.split('.');
  return q[q.length - 1];
}

async function checkAndCreateDir(filepath) {
  const f = filepath.split('/');
  f.pop();
  const q = f.join('/');

  try {
    return Promise.allSettled([await fs.stat(path.resolve(__dirname, q))]);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('➡  Creating ' + q);
      await fs.mkdir(path.resolve(__dirname, q), { recursive: true });
      return Promise.resolve();
    }

    return Promise.reject(error);
  }
}
