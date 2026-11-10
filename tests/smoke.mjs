import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [html, css, js] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
]);

for (const text of ['台风实况面板', '路径示意图', '蓝色预警', '黄色预警', '橙色预警', '红色预警']) {
  assert.ok(html.includes(text), `页面缺少：${text}`);
}
assert.match(html, /data-status-message/);
assert.match(html, /浙江省台风路径实时发布系统/);
assert.equal((html.match(/type="checkbox"/g) || []).length, 16);
assert.match(css, /html\[data-theme="night"\]/);
assert.doesNotMatch(css, /body\{[^}]*min-width:320px/, '320px 小屏不应因固定最小宽度产生横向滚动');
assert.match(js, /localStorage/);
assert.match(js, /status === 'no-active'/);
assert.match(js, /renderDemo/);
console.log('页面结构检查通过：实况、路径、四级清单、真实数据状态、降级标记和双主题均已包含。');

