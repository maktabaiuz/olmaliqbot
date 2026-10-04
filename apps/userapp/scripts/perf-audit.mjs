// Ilova ekranlarini sekin telefon (4x CPU, sekin 4G) sharoitida ochib,
// yuklanish vaqti va konsol xatolarini o'lchaydi.
// Ishlatish: USER_BOT_TOKEN=... node scripts/perf-audit.mjs   (dist/ build qilingan bo'lishi kerak)
import { spawn, execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';

const token = process.env.USER_BOT_TOKEN;
if (!token) throw new Error('USER_BOT_TOKEN kerak');
const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 999000111, first_name: 'Test' }) });
const dcs = [...p.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}=${v}`).join('\n');
p.set('hash', crypto.createHmac('sha256', crypto.createHmac('sha256', 'WebAppData').update(token).digest()).update(dcs).digest('hex'));
const stub = `<script>window.__errs=[];addEventListener('error',e=>__errs.push('ERR '+e.message));addEventListener('unhandledrejection',e=>__errs.push('REJ '+(e.reason&&e.reason.message||e.reason)));const _ce=console.error;console.error=(...a)=>{__errs.push(a.map(String).join(' ').slice(0,160));_ce(...a)};localStorage.setItem('kimbor_onboarded_v1','1');sessionStorage.setItem('kimbor_poster_seen','1');window.Telegram={WebApp:{initData:${JSON.stringify(p.toString())},initDataUnsafe:{user:{id:999000111,first_name:'Test'}},colorScheme:'light',ready(){},expand(){},openLink(){},openTelegramLink(){},BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};</script>`;
fs.writeFileSync('dist/test.html', fs.readFileSync('dist/index.html', 'utf8').replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>', stub));

const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore', detached: true });
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9334', '--user-data-dir=/tmp/kb-audit', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3000);
let t;
for (let i = 0; i < 40; i++) { try { t = await (await fetch('http://127.0.0.1:9334/json')).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Network.enable');
await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 90_000 });
await send('Emulation.setCPUThrottlingRate', { rate: 4 });
const routes = ['/', '/search', '/search?q=santexnik%20kerak', '/rent', '/rent/add', '/saved', '/profile', '/sos', '/add', '/chat', '/category/USTA', '/map'];
let first = true;
for (const r of routes) {
  const t0 = Date.now();
  await send('Page.navigate', { url: `http://localhost:4173/app/test.html#${r}` });
  let done = false;
  for (let i = 0; i < 80 && !done; i++) {
    await sleep(250);
    const v = await send('Runtime.evaluate', { expression: "JSON.stringify({sk:document.querySelectorAll('.skeleton').length,txt:document.body.innerText.length,icons:document.fonts.check('24px \"Material Symbols Outlined\"'),errs:window.__errs||[]})", returnByValue: true });
    if (!v?.result?.value) continue;
    const o = JSON.parse(v.result.value);
    if (o.sk === 0 && o.txt > 60) {
      console.log(`${r.padEnd(26)} ${String(Date.now() - t0).padStart(5)} ms${first ? ' (birinchi ochilish)' : ''}  ikonka=${o.icons ? 'ha' : "yo'q"}  xato=${o.errs.length ? JSON.stringify(o.errs.slice(0, 2)) : 0}`);
      done = true;
    } else if (i === 79) console.log(`${r.padEnd(26)} 20s+ tayyor emas (skeleton=${o.sk})  xato=${JSON.stringify(o.errs.slice(0, 2))}`);
  }
  first = false;
}
chrome.kill(); try { process.kill(-preview.pid); } catch {} fs.rmSync('dist/test.html', { force: true });
process.exit(0);
