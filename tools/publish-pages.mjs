import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import ghPages from 'gh-pages';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(projectRoot);
// Keep publishing isolated from caches created by other gh-pages commands.
process.env.CACHE_DIR ||= join(projectRoot, 'node_modules', '.cache', 'inklune-pages');

await new Promise((resolve, reject) => {
  ghPages.publish(join(projectRoot, 'dist'), {
    branch: 'gh-pages',
    dotfiles: true,
    nojekyll: true,
    message: 'Publish Inklune static site',
  }, error => error ? reject(error) : resolve());
});
console.log('Published: https://lake-evendim.github.io/inklune/');
