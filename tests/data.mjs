import { readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = new URL('./forced-fallback.json', import.meta.url);
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/fetch-typhoon.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, TYPHOON_FORCE_FAIL: '1', TYPHOON_OUTPUT: fileURLToPath(output) },
    stdio: 'inherit',
  });
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`退出码 ${code}`)));
});
const data = JSON.parse(await readFile(output, 'utf8'));
assert.equal(data.status, 'demo');
assert.match(data.message, /演示数据/);
assert.equal(data.source.name, '浙江省台风路径实时发布系统');
await rm(output);
console.log('数据降级检查通过：抓取失败时会明确切换到演示数据。');
