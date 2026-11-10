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

