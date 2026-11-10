const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
const themeLabel = themeButton.querySelector('b');
const toast = document.querySelector('.toast');
const themeKey = 'typhoon-demo-theme';
const checklistKey = 'typhoon-demo-checklist';

function readStorage(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* 严格隐私模式下不保存 */ }
}
function applyTheme(theme) {
  const night = theme === 'night';
  root.dataset.theme = night ? 'night' : 'day';
  themeButton.setAttribute('aria-pressed', String(night));
  themeButton.setAttribute('aria-label', night ? '切换到白天主题' : '切换到夜间主题');
  themeLabel.textContent = night ? '夜间' : '白天';
}

const savedTheme = readStorage(themeKey, '');
const preferredTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
applyTheme(savedTheme || preferredTheme);

themeButton.addEventListener('click', () => {
  const next = root.dataset.theme === 'night' ? 'day' : 'night';
  applyTheme(next);
  writeStorage(themeKey, next);
  showToast(next === 'night' ? '已切换到夜间主题' : '已切换到白天主题');
});

let state = {};
try { state = JSON.parse(readStorage(checklistKey, '{}')) || {}; } catch { state = {}; }

function updateProgress(card) {
  const inputs = [...card.querySelectorAll('input')];
  card.querySelector('.progress span').textContent = inputs.filter(input => input.checked).length;
}
function saveChecklist() {
  const next = {};
  document.querySelectorAll('.plan').forEach(card => {
    next[card.dataset.plan] = [...card.querySelectorAll('input')].map(input => input.checked);
  });
  writeStorage(checklistKey, JSON.stringify(next));
}

document.querySelectorAll('.plan').forEach(card => {
  const inputs = [...card.querySelectorAll('input')];
  inputs.forEach((input, index) => {
    input.checked = Boolean(state[card.dataset.plan]?.[index]);
    input.addEventListener('change', () => {
      updateProgress(card);
      saveChecklist();
      if (inputs.every(item => item.checked)) showToast(`${card.querySelector('header small').textContent}清单已完成`);
    });
  });
  card.querySelector('button').addEventListener('click', () => {
    inputs.forEach(input => { input.checked = false; });
    updateProgress(card);
    saveChecklist();
    showToast('本级勾选已清空');
  });
  updateProgress(card);
});

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

const $ = selector => document.querySelector(selector);
const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };

function formatTime(value) {
  if (!value) return '时间未知';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T') + '+08:00');
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function setStatus(kind, badge, message) {
  document.body.dataset.dataState = kind;
  setText('#data-status-badge', badge);
  setText('#data-status-message', message);
}

function renderNoActive(data) {
  setStatus('no-active', '官方实况', data.message || '当前无活动台风');
  setText('#update-label', `数据更新于 ${formatTime(data.fetchedAt)}`);
  setText('#storm-code', '浙江省台风实况');
  $('#storm-name').innerHTML = '当前无活动台风 <small>NO ACTIVE TYPHOON</small>';
  setText('.storm-level b', '平稳');
  setText('.storm-level span', '请继续留意天气变化');
  for (const metric of document.querySelectorAll('.metrics > div')) {
    metric.querySelector('strong').innerHTML = '—';
    metric.querySelector('em').textContent = '暂无实况';
  }
  setText('#where-text', '当前没有正在活动的台风中心');
  setText('#coordinates', '无需显示台风中心坐标');
  setText('#action-now', '保持日常关注，遇到恶劣天气以当地最新通知为准');
  setText('#track-eyebrow', '官方实况 · 暂无活动路径');
  setText('#map-summary', '当前无活动台风，暂无路径可显示');
  setText('#map-watermark', '官方数据 · 暂无活动台风');
  setText('#map-title', '浙江省台风实况路径图');
  setText('#map-desc', '官方数据当前没有活动台风，因此没有路径可显示。');
  $('.track-map').classList.add('no-track');
  $('.current').style.display = 'none';
  $('.now-label').style.display = 'none';
  $('.past').setAttribute('d', '');
  $('.future').setAttribute('d', '');
  $('.past-points').replaceChildren();
  $('.future-points').replaceChildren();
  document.querySelector('.current-plan>em')?.remove();
  $('.current-plan')?.classList.remove('current-plan');
}

function setMetric(name, value, unit, note) {
  const box = $(`[data-metric="${name}"]`);
  box.querySelector('strong').innerHTML = `${value ?? '—'}<small>${unit}</small>`;
  box.querySelector('em').textContent = note;
}

function renderTrack(storm) {
  const past = storm.past.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)).slice(-12);
  const future = storm.forecast.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const all = [...past, ...future];
  if (!all.length) return;
  const lngs = all.map(p => p.lng), lats = all.map(p => p.lat);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs), minLat = Math.min(...lats), maxLat = Math.max(...lats);
  if (maxLng - minLng < 2) { minLng -= 1; maxLng += 1; }
  if (maxLat - minLat < 2) { minLat -= 1; maxLat += 1; }
  const xy = p => ({ x: 90 + (p.lng - minLng) / (maxLng - minLng) * 580, y: 320 - (p.lat - minLat) / (maxLat - minLat) * 250 });
  const path = points => points.map((p, i) => { const v = xy(p); return `${i ? 'L' : 'M'}${v.x.toFixed(1)} ${v.y.toFixed(1)}`; }).join(' ');
  $('.past').setAttribute('d', path(past));
  $('.future').setAttribute('d', path([past.at(-1), ...future].filter(Boolean)));
  const ns = 'http://www.w3.org/2000/svg';
  for (const [selector, points, radius] of [['.past-points', past.slice(0, -1), 5], ['.future-points', future, 6]]) {
    const group = $(selector); group.replaceChildren();
    for (const point of points) { const pos = xy(point); const circle = document.createElementNS(ns, 'circle'); circle.setAttribute('cx', pos.x); circle.setAttribute('cy', pos.y); circle.setAttribute('r', radius); group.append(circle); }
  }
  const nowPos = xy(past.at(-1) || storm.now);
  $('.current').setAttribute('transform', `translate(${nowPos.x} ${nowPos.y})`);
  $('.now-label').setAttribute('transform', `translate(${Math.min(nowPos.x + 17, 650)} ${Math.max(nowPos.y - 30, 20)})`);
  $('.now-label text').textContent = `现在 · ${formatTime(storm.now.time).split(' ').at(-1)}`;
}

function renderLive(data) {
  const storm = data.storm;
  setStatus('live', '官方实况', data.message);
  setText('#update-label', `抓取于 ${formatTime(data.fetchedAt)}`);
  setText('#storm-code', `${storm.id} · 实况台风`);
  $('#storm-name').innerHTML = `${storm.name || '未命名'} <small>${storm.enName || ''}</small>`;
  setText('.storm-level b', storm.now.strong || '台风');
  setText('.storm-level span', `正在${storm.now.moveDirection || '未知方向'}移动`);
  setMetric('wind', storm.now.power, '级', `${storm.now.windSpeed ?? '—'} 米/秒`);
  setMetric('pressure', storm.now.pressure, 'hPa', '最新实况');
  setMetric('move', storm.now.moveSpeed, 'km/h', storm.now.moveDirection || '方向未知');
  setText('#where-text', '西北太平洋海面（请结合当地通知判断影响）');
  setText('#coordinates', `北纬 ${storm.now.lat}° · 东经 ${storm.now.lng}°`);
  setText('#action-now', '收好室外物品，远离海边，持续留意当地官方预警');
  setText('#track-eyebrow', `${storm.forecastAgency || '官方'}预报路径 · 示意位置`);
  setText('#map-summary', `预计向${storm.now.moveDirection || '未知方向'}移动`);
  setText('#map-watermark', '官方路径数据 · 示意图');
  setText('#map-title', `${storm.name}台风路径示意图`);
  setText('#map-desc', `${storm.name}台风当前位于北纬${storm.now.lat}度、东经${storm.now.lng}度，向${storm.now.moveDirection || '未知方向'}移动。`);
  $('.city').style.display = 'none';
  $('.cone').style.display = 'none';
  $('.times').style.display = 'none';
  renderTrack(storm);
  document.querySelector('.current-plan>em')?.remove();
  $('.current-plan')?.classList.remove('current-plan');
}

function renderDemo(message = '真实数据暂不可用，正在显示演示数据') {
  setStatus('demo', '演示', message);
  setText('#update-label', '真实数据获取失败');
  setText('#source-badge', '演示数据');
}

async function loadTyphoonData() {
  try {
    const response = await fetch(`data/typhoon.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const ageMinutes = (Date.now() - Date.parse(data.fetchedAt)) / 6e4;
    if (data.status === 'live' && data.storm && ageMinutes > 90) renderDemo('真实数据超过 90 分钟未更新，正在显示演示数据');
    else if (data.status === 'live' && data.storm) renderLive(data);
    else if (data.status === 'no-active') renderNoActive(data);
    else renderDemo(data.message);
  } catch {
    renderDemo();
  }
}

loadTyphoonData();

