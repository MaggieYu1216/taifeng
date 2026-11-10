import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE_URL = 'https://typhoon.slt.zj.gov.cn/';
const API_ROOT = `${SOURCE_URL}Api`;
const output = resolve(process.env.TYPHOON_OUTPUT || 'data/typhoon.json');

function shanghaiYear() {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric' }).format(new Date());
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Referer: SOURCE_URL, 'User-Agent': 'typhoon-one-screen/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function latestPoint(points = []) {
  return [...points].filter(point => point?.time).sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).at(-1);
}

export function normalizeStorm(detail) {
  const now = latestPoint(detail.points);
  if (!now) throw new Error('详情中没有实况点');
  const china = (now.forecast || []).find(item => item.tm === '中国') || (now.forecast || [])[0];
  return {
    id: detail.tfid, name: detail.name, enName: detail.enname,
    now: {
      time: now.time, lat: Number(now.lat), lng: Number(now.lng), strong: now.strong,
      power: now.power, windSpeed: now.speed, pressure: now.pressure,
      moveSpeed: now.movespeed, moveDirection: now.movedirection,
    },
    past: (detail.points || []).map(point => ({
      time: point.time, lat: Number(point.lat), lng: Number(point.lng), strong: point.strong, power: point.power,
    })),
    forecast: (china?.forecastpoints || []).map(point => ({
      time: point.time, lat: Number(point.lat), lng: Number(point.lng), strong: point.strong, power: point.power,
    })),
    forecastAgency: china?.tm || null,
  };
}

function envelope(status, message, storm = null) {
  return {
    status, fetchedAt: new Date().toISOString(), message, storm,
    source: { name: '浙江省台风路径实时发布系统', url: SOURCE_URL },
  };
}

export async function fetchTyphoon() {
  if (process.env.TYPHOON_FORCE_FAIL === '1') throw new Error('forced failure');
  const list = await getJson(`${API_ROOT}/TyphoonList/${shanghaiYear()}`);
  if (!Array.isArray(list)) throw new Error('年度列表格式异常');
  for (const candidate of list.filter(item => String(item.isactive) === '1')) {
    const detail = await getJson(`${API_ROOT}/TyphoonInfo/${candidate.tfid}`);
    const point = latestPoint(detail.points);
    const pointTime = point?.time ? Date.parse(point.time.replace(' ', 'T') + '+08:00') : NaN;
    const ageHours = Number.isFinite(pointTime) ? (Date.now() - pointTime) / 36e5 : Infinity;
    if (String(detail.isactive) === '1' && ageHours <= 36) {
      return envelope('live', '正在显示浙江省台风路径实时发布系统数据', normalizeStorm(detail));
    }
  }
  return envelope('no-active', '官方数据已更新：当前无活动台风');
}

let result;
try {
  result = await fetchTyphoon();
} catch (error) {
  console.error(`抓取失败，将使用演示数据：${error.message}`);
  result = envelope('demo', '真实数据暂不可用，正在显示演示数据');
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(`已写入 ${output}（${result.status}）`);
