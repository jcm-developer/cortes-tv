/**
 * Builds the site for Cloudflare Pages, deploying the Convex functions first on production.
 *
 * With `CONVEX_DEPLOY_KEY` set and outside a preview branch, `convex deploy` pushes `convex/` to
 * the production deployment and runs the site build with `PUBLIC_CONVEX_URL` pointing at it.
 * Preview branches (`CF_PAGES_BRANCH` other than `main`) and builds without the key only run
 * `astro build`, so they never touch production functions.
 *
 * Run: `pnpm run build:site`. See `docs/operations.md`, "Deploy".
 */
import { spawnSync } from 'node:child_process';

const PRODUCTION_BRANCH = 'main';
const onCloudflare = process.env.CF_PAGES === '1';
const branch = process.env.CF_PAGES_BRANCH ?? '';
const isPreview = onCloudflare && branch !== PRODUCTION_BRANCH;
const deployConvex = Boolean(process.env.CONVEX_DEPLOY_KEY) && !isPreview;

/**
 * Runs a shell command, streaming its output, and exits with its code when it fails.
 *
 * @param {string} command - The command line.
 */
function run(command) {
  console.log(`> ${command}`);
  const { status } = spawnSync(command, { stdio: 'inherit', shell: true });
  if (status !== 0) process.exit(status ?? 1);
}

if (deployConvex) {
  run('npx convex deploy --cmd "npm run build" --cmd-url-env-var-name PUBLIC_CONVEX_URL');
} else {
  console.log(
    isPreview
      ? `Preview branch "${branch}": building without deploying Convex.`
      : 'No CONVEX_DEPLOY_KEY: building without Convex.',
  );
  run('npm run build');
}
