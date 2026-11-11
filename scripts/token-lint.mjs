// CLI for scripts/token-lint-core.mjs: checks every .css/.ts/.tsx under src (Ember UI itself is not ours to lint).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lintSource } from './token-lint-core.mjs';

const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(css|tsx?)$/.test(n) && !/\.test\.tsx?$/.test(n)) files.push(p); } })('src');
const bad = files.flatMap((f) => lintSource(f, readFileSync(f, 'utf8')));
bad.forEach((b) => console.log('FAIL', b));
console.log(`${files.length} files checked, ${bad.length} problems`);
process.exit(bad.length ? 1 : 0);
