import { join } from 'node:path';

/**
 * `process.cwd()` (not `__dirname`) so this resolves correctly in every runtime we target:
 * `node dist/main.js` run from the repo root, and Vercel's Node serverless functions,
 * which both execute with cwd = the project root. `__dirname` would break on Vercel since
 * `api/index.ts` is bundled independently of `nest build`'s dist/ layout.
 */
export const WEB_UI_DIST = join(process.cwd(), 'web-ui', 'dist');
