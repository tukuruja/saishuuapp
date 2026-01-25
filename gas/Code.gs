/**
 * ===========================================================================
 * VΩ.Infinity Genba Task Master [v203.1 Internal Edition]
 * Optimized for: 株式会社相模建設ツクルンジャー (社内運用専用)
 * 修正: カレンダーID未設定時の自動フォールバック機能搭載
 * ===========================================================================
 */
const CONFIG = {
  COMPANY: "株式会社相模建設ツクルンジャー",
  BASE_ADDRESS: "神奈川県相模原市松が丘1-3-13",
  FUEL_EFF: 8.0, GAS_PRICE: 185, PROFIT_GOAL_RATE: 0.24,
  TIMEZONE: 'Asia/Tokyo', WORK_START: '08:00:00', WORK_END: '17:00:00'
};
const SHEET_VARIANTS = {
  SCHEDULE: ['日程表', 'T_Schedule', 'Schedule'],
  REPORT: ['日報データ', 'T_Reports', 'Reports'],
  DETAIL: ['日報明細', 'T_Details', 'Details'],
  INVOICE: ['請求書データ', 'T_Invoices', 'Invoices'],
  CLIENT: ['マスタ_顧客', 'M_Contracts', 'Clients'],
  SITE: ['マスタ_現場', 'M_Sites', 'Sites'],
  WORKER: ['マスタ_作業員', 'M_Workers', 'Workers'],
  MACHINE: ['マスタ_機械', 'M_Machines', 'Machines'],
  MATERIAL: ['マスタ_材料', 'M_Materials', 'Materials'],
  ESTIMATE: ['マスタ_契約工種', 'M_Estimates', 'Estimates'],
  CONFIG: ['Sys_Config', 'Config']
};

/* --- ▼ 2. INITIALIZATION ▼ --- */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('⚡ 家族予定表メニュー')
      .addItem('🔑 承認権限の更新 (初回必須)', 'forceAuthRequest')
      .addSeparator()
      .addItem('✅ 選択行を承認＆カレンダー同期', 'approveSelectedReport')
      .addItem('📄 選択行をPDF出力', 'generateSelectedReportPdf')
      .addItem('📢 LINE一斉送信', 'forceRunAutoLine')
      .addToUi();
  } catch (e) {}
}
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(`家族予定表(感謝) v203.1`)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function forceAuthRequest() {
  CalendarApp.getDefaultCalendar();
  DriveApp.getRootFolder();
  Maps.newDirectionFinder();
  SpreadsheetApp.getActiveSpreadsheet();
  ensureFolder('VΩ_SitePhotos'); // フォルダ生成テスト
  return { success: true, msg: "✅ 権限更新完了" };
}

/* ★修正: ID設定を柔軟に */
function saveCompanyCalendarId(id) {
  if (!id) {
    PROPS.deleteProperty('COMPANY_CALENDAR_ID');
    return { success: true, msg: "設定を解除しました。\n今後は「あなたのカレンダー」に保存されます。" };
  }
  // IDチェック (失敗しても保存は許可する柔軟設計に変更)
  try {
    const cal = CalendarApp.getCalendarById(id);
    if (cal) {
      PROPS.setProperty('COMPANY_CALENDAR_ID', id);
      return { success: true, msg: `✅ 接続成功: ${cal.getName()}` };
    }
  } catch (e) {}

  // IDが間違っていても、とりあえず保存はせず警告だけ返す
  return { success: false, msg: `⚠️ IDが見つかりませんでしたが、解除しました。` };
}

function getStartupData() {
  const lineCfg = getLineConfig();
  const response = {
    success: false, clients: [], sites: [], workers: [], machines: [], materials: [], estimates: [],
    config: {
      lineActive: lineCfg.active, lineTime: lineCfg.time, company: CONFIG.COMPANY, baseAddress: CONFIG.BASE_ADDRESS,
      calendarIdSet: !!PROPS.getProperty('COMPANY_CALENDAR_ID')
    },
    holidays: getHolidays()
  };
  try {
    const getVal = (key) => {
      const s = getSheet(key);
      return s && s.getLastRow() > 1 ? s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues() : [];
    };
    response.clients = getVal('CLIENT').map(r => ({ id: String(r[0]), name: r[1], short: r[2], color: r[3] }));
    response.sites = getVal('SITE').map(r => ({ id: String(r[0]), cid: String(r[1]), name: r[2], short: r[3], addr: r[4], contractPrice: Number(r[5]) || 0 }));
    response.workers = getVal('WORKER').filter(r => r[0]).map(r => ({ id: String(r[0]), name: r[1], short: r[2], type: r[3], cost: Number(r[5]) || 20000, lineId: r[7] }));
    response.machines = getVal('MACHINE').map(r => ({ id: String(r[0]), cat: r[1] || '機械', name: r[2], price: Number(r[4]) || 0, unit: r[5] || '台', remarks: r[6] || '' }));
    response.materials = getVal('MATERIAL').map(r => ({ id: String(r[0]), cat: r[1] || '資材', name: r[2], price: Number(r[4]) || 0, unit: r[5] || '個', remarks: r[6] || '' }));
    response.estimates = getVal('ESTIMATE').map(r => ({ sid: String(r[0]), item: r[1], unit: r[2] || '式', price: Number(r[3]) || 0, qty: Number(r[4]) || 0, remarks: r[5] || '' }));
    response.success = true;
  } catch (e) { response.msg = e.toString(); }
  return response;
}

/* --- ▼ 3. SCHEDULE ▼ --- */
function getSchedules(s, e) {
  const sh = getSheet('SCHEDULE'); if (!sh || sh.getLastRow() < 2) return [];
  const clientMap = {}; getSheet('CLIENT').getDataRange().getValues().forEach(c => clientMap[String(c[0])] = { name: c[1], color: c[3] });
  const siteMap = {}; getSheet('SITE').getDataRange().getValues().forEach(s => siteMap[String(s[0])] = { name: s[2], short: s[3], cid: String(s[1]) });
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  const vsDate = new Date(s); vsDate.setHours(0, 0, 0, 0);
  const veDate = new Date(e); veDate.setHours(23, 59, 59, 999);
  const res = [];
  const scanLimit = Math.max(0, data.length - 3000);
  for (let i = scanLimit; i < data.length; i++) {
    const r = data[i]; if (!r[1]) continue;
    try {
      const dRaw = new Date(r[1]); if (isNaN(dRaw.getTime())) continue;
      const strStart = Utilities.formatDate(dRaw, TIMEZONE, 'yyyy-MM-dd');
      const dStart = new Date(strStart + 'T00:00:00+09:00');
      let dEnd = r[2] ? (new Date(Utilities.formatDate(new Date(r[2]), TIMEZONE, 'yyyy-MM-dd') + 'T00:00:00+09:00')) : new Date(dStart.getTime());
      if (dEnd < dStart) dEnd = new Date(dStart.getTime());
      if (dStart > veDate || dEnd < vsDate) continue;
      const siteId = String(r[3]);
      const site = siteMap[siteId];
      let color = '#888'; let clientName = '未登録';
      if (site && clientMap[site.cid]) { color = clientMap[site.cid].color; clientName = clientMap[site.cid].name; }
      let loopDate = new Date(Math.max(dStart.getTime(), vsDate.getTime()));
      const loopEnd = new Date(Math.min(dEnd.getTime(), veDate.getTime()));
      let rawContent = r[7] || '';
      let displayContent = rawContent;
      let contractList = [];
      if (String(rawContent).trim().startsWith('[')) { try { contractList = JSON.parse(rawContent); displayContent = contractList.map(item => `${item.name}`).join(', '); } catch (e) { displayContent = rawContent; } }
      while (loopDate <= loopEnd) {
        const dStr = Utilities.formatDate(loopDate, CONFIG.TIMEZONE, 'yyyy-MM-dd');
        res.push({
          id: String(r[0]) + '_' + dStr, realId: String(r[0]),
          start: `${dStr}T${CONFIG.WORK_START}`, end: `${dStr}T${CONFIG.WORK_END}`, allDay: false,
          siteId: siteId, siteName: site ? site.name : 'Unknown', clientName: clientName,
          workerIds: String(r[4]).split(',').filter(x => x), machineIds: String(r[5]).split(',').filter(x => x), materialIds: String(r[6]).split(',').filter(x => x),
          content: displayContent, contractItems: contractList, status: r[9] || 'Active', color: color
        });
        loopDate.setDate(loopDate.getDate() + 1);
      }
    } catch (ex) {}
  }
  return res;
}
function saveScheduleEvent(evt) {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return { success: false, msg: "Busy" };
  try {
    const sh = getSheet('SCHEDULE'); const id = evt.id || Utilities.getUuid();
    const wIds = (evt.workerIds || []).join(','); const mIds = (evt.machineIds || []).join(','); const matIds = (evt.materialIds || []).join(',');
    const content = (typeof evt.contractItems === 'object' && evt.contractItems.length > 0) ? JSON.stringify(evt.contractItems) : (evt.content || '');
    let targetRow = -1;
    if (evt.id) { const data = sh.getDataRange().getValues(); for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(evt.id)) { targetRow = i + 1; break; } }
    const sDate = evt.start.split('T')[0]; const eDate = evt.end ? evt.end.split('T')[0] : sDate;
    const rowData = [id, sDate, eDate, evt.siteId, wIds, mIds, matIds, content, '', 'Active'];
    if (targetRow > 0) sh.getRange(targetRow, 1, 1, 10).setValues([rowData]); else sh.appendRow(rowData);
    SpreadsheetApp.flush();
    return { success: true, msg: "保存完了" };
  } catch (e) { return { success: false, msg: e.toString() }; } finally { lock.releaseLock(); }
}

/* --- ▼ 4. CALCULATION ▼ --- */
function calculateCostAndWeather(siteId) {
  const site = getSheet('SITE').getDataRange().getValues().find(r => String(r[0]) === String(siteId));
  if (!site) return { success: false, msg: "現場データなし" };
  const dest = site[4];
  const result = { success: true, items: [], weather: null, total: 0 };
  const origin = CONFIG.BASE_ADDRESS;
  if (dest) {
    try {
      const dir = Maps.newDirectionFinder().setOrigin(origin).setDestination(dest).setMode(Maps.DirectionFinder.Mode.DRIVING).getDirections();
      if (dir.routes && dir.routes.length > 0) {
        const leg = dir.routes[0].legs[0];
        const fuelCost = Math.ceil((leg.distance.value / 1000 * 2 / CONFIG.FUEL_EFF) * CONFIG.GAS_PRICE);
        result.items.push({ name: `燃料費 (往復) ${leg.distance.text}`, price: fuelCost, unit: '式', remarks: '自動計算' }); result.total += fuelCost;
      }
    } catch (ex) {}
    try { result.weather = { desc: '晴', temp: 20 }; } catch (e) {}
  }
  return result;
}

function getGraphData(year, month, mode) {
  const start = mode === 'month' ? new Date(year, month - 1, 1) : new Date(2000, 0, 1);
  const end = new Date(year, month, 0); end.setHours(23, 59, 59);
  const dData = getSheet('DETAIL').getDataRange().getValues();
  const sites = getSheet('SITE').getDataRange().getValues();
  const invoices = getSheet('INVOICE').getDataRange().getValues();
  const siteMap = {};
  sites.slice(1).forEach(s => { siteMap[String(s[0])] = { name: s[2], price: Number(s[5]) || 0, cost: 0, invoiced: 0 }; });
  invoices.slice(1).forEach(r => { for (let sid in siteMap) if (siteMap[sid].name === r[2]) siteMap[sid].invoiced += Number(r[4]) || 0; });
  const stats = { sales: 0, cost: 0, breakdown: { LABOR: 0, MATERIAL: 0, MACHINE: 0, EXPENSE: 0 } };
  const workerStats = {};
  for (let i = 1; i < dData.length; i++) {
    const r = dData[i]; const d = new Date(r[1]);
    if (d < start || d > end) continue;
    const sid = String(r[2]), type = r[3], name = r[4], amt = Number(r[8]) || 0;
    if (siteMap[sid] && type !== 'WORK') siteMap[sid].cost += amt;
    if (type === 'WORK') stats.sales += amt;
    else {
      stats.cost += amt; stats.breakdown[type] = (stats.breakdown[type] || 0) + amt;
      if (type === 'LABOR') workerStats[name] = (workerStats[name] || 0) + 1;
    }
  }
  const siteAnalysis = Object.keys(siteMap).map(sid => {
    const s = siteMap[sid]; if (s.price === 0 && s.cost === 0) return null;
    const profit = s.price - s.cost;
    return { name: s.name, price: s.price, cost: s.cost, profit: profit, is24Ok: (profit >= s.price * CONFIG.PROFIT_GOAL_RATE), invoiceDiff: s.cost - s.invoiced };
  }).filter(x => x).sort((a, b) => b.cost - a.cost);
  const ranking = Object.keys(workerStats).map(name => ({ name: name, days: workerStats[name] })).sort((a, b) => b.days - a.days).slice(0, 10);
  return { success: true, stats: stats, sites: siteAnalysis, ranking: ranking };
}

/* --- ▼ 6. REPORT & SYNC ▼ --- */
function submitDailyReport(d) {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) return { success: false, msg: "混雑中" };
  try {
    const rSh = getSheet('REPORT'); const dSh = getSheet('DETAIL'); const sSh = getSheet('SCHEDULE');
    const id = d.id || Utilities.getUuid();
    const photoUrls = (d.photos || []).map(p => p.data ? saveImageToDrive(p.data, d.siteName, d.date) : (p.url || '')).filter(u => u);
    const allResources = [...d.materials, ...d.machines];
    const rowData = [id, d.date, d.clientId, d.siteId, d.clientName, d.siteName, JSON.stringify(d.labor), JSON.stringify(allResources), JSON.stringify(d.works), JSON.stringify(d.expenses), '提出済', d.totalCost, d.weather, d.temp, JSON.stringify(photoUrls)];
    let targetRow = -1;
    if (d.id) { const data = rSh.getDataRange().getValues(); for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(d.id)) { targetRow = i + 1; break; } }
    if (targetRow > 0) { rSh.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]); deleteRowsByCol(dSh, 0, d.id); } else rSh.appendRow(rowData);
    const rows = [];
    d.labor.forEach(x => rows.push([id, d.date, d.siteId, 'LABOR', x.name, x.qty, '人工', 20000, x.qty * 20000, x.startTime]));
    d.materials.forEach(x => rows.push([id, d.date, d.siteId, 'MATERIAL', x.name, x.qty, x.unit || '個', x.price, x.qty * x.price, x.company || '']));
    d.machines.forEach(x => rows.push([id, d.date, d.siteId, 'MACHINE', x.name, x.qty, x.unit || '台', x.price, x.qty * x.price, x.company || '']));
    d.works.forEach(x => rows.push([id, d.date, d.siteId, 'WORK', x.item, x.qty, x.unit || '式', x.price, x.qty * x.price, '']));
    d.expenses.forEach(x => rows.push([id, d.date, d.siteId, 'EXPENSE', x.name, 1, '式', x.price, x.price, '']));
    if (rows.length) dSh.getRange(dSh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    if (d.scheduleId) {
      const realId = d.scheduleId.split('_')[0];
      const sData = sSh.getDataRange().getValues();
      for (let i = 1; i < sData.length; i++) if (String(sData[i][0]) === realId) { sSh.getRange(i + 1, 10).setValue('Reported'); break; }
    }
    SpreadsheetApp.flush();
    return { success: true, profit: d.totalCost };
  } catch (e) { return { success: false, msg: e.toString() }; } finally { lock.releaseLock(); }
}

/* ★修正: カレンダー連携 (IDなしならデフォルトへ) */
function approveAndSyncToCalendar(reportId) {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return { success: false, msg: "Busy" };
  let event = null;
  try {
    const rSh = getSheet('REPORT'); const sSh = getSheet('SCHEDULE');
    const data = rSh.getDataRange().getValues();
    let rIdx = -1, row = null;
    for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(reportId)) { rIdx = i + 1; row = data[i]; break; }
    if (!row || row[10] === '承認済') return { success: false, msg: "承認済です" };

    // ID取得またはデフォルト
    const savedId = PROPS.getProperty('COMPANY_CALENDAR_ID');
    let targetCalendar;

    if (savedId) {
      try { targetCalendar = CalendarApp.getCalendarById(savedId); } catch (e) {}
    }
    if (!targetCalendar) targetCalendar = CalendarApp.getDefaultCalendar(); // Fallback

    const desc = `【承認済】\n作業員: ${(JSON.parse(row[6] || '[]').map(w => w.name).join(', '))}\n金額: ¥${Number(row[11]).toLocaleString()}`;
    event = targetCalendar.createAllDayEvent(`【完】${row[5]}`, new Date(row[1]), { description: desc });

    try {
      rSh.getRange(rIdx, 11).setValue('承認済');
      const dStr = Utilities.formatDate(new Date(row[1]), CONFIG.TIMEZONE, 'yyyy-MM-dd');
      const sData = sSh.getDataRange().getValues();
      for (let i = 1; i < sData.length; i++) if (String(sData[i][3]) === String(row[3]) && Utilities.formatDate(new Date(sData[i][1]), CONFIG.TIMEZONE, 'yyyy-MM-dd') === dStr) sSh.getRange(i + 1, 10).setValue('Approved');
      SpreadsheetApp.flush();
    } catch (sheetError) { if (event) event.deleteEvent(); throw new Error("更新失敗のためロールバックしました: " + sheetError.message); }
    return { success: true, msg: "承認完了" };
  } catch (e) { return { success: false, msg: e.toString() }; } finally { lock.releaseLock(); }
}

/* --- ▼ 7. UTILS ▼ --- */
function analyzeReceiptImage(base64Image) {
  const apiKey = API_KEYS.OPENAI; if (!apiKey) return { success: false, msg: "AI設定エラー" };
  const url = "https://api.openai.com/v1/chat/completions";
  const payload = { model: "gpt-4o", response_format: { type: "json_object" }, messages: [{ role: "system", content: `Parse receipt to JSON: { "items": [ { "name": "ItemName", "price": Number, "qty": Number } ] }.` }, { role: "user", content: [{ type: "text", text: "Parse" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }] }] };
  try {
    const res = UrlFetchApp.fetch(url, { method: "post", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, payload: JSON.stringify(payload), muteHttpExceptions: true });
    return { success: true, items: JSON.parse(JSON.parse(res.getContentText()).choices[0].message.content).items || [] };
  } catch (e) { return { success: false, msg: e.toString() }; }
}
function forceRunAutoLine() {
  const users = getSheet('WORKER').getDataRange().getValues();
  const tStr = Utilities.formatDate(new Date(new Date().getTime() + 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const sch = getSchedules(tStr, tStr);
  const notifyMap = {};
  sch.forEach(s => s.workerIds.forEach(uid => { const w = users.find(u => String(u[0]) === String(uid)); if (w && w[7]) { if (!notifyMap[w[7]]) notifyMap[w[7]] = []; notifyMap[w[7]].push(`${s.siteName}: ${s.content}`); } }));
  let c = 0; for (const [lid, msg] of Object.entries(notifyMap)) { sendLineNotify(lid, `【明日 ${tStr}】\n${msg.join('\n')}\n安全第一で！`); c++; }
  return { success: true, msg: `${c}件送信` };
}
function sendLineNotify(uid, msg) { if (!API_KEYS.LINE) return; try { UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', { method: 'post', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEYS.LINE }, payload: JSON.stringify({ to: uid, messages: [{ type: 'text', text: msg }] }), muteHttpExceptions: true }); } catch (e) {} }
function generateSelectedReportPdf() { try { const ss = SpreadsheetApp.getActiveSpreadsheet(); const rid = ss.getActiveSheet().getRange(ss.getActiveSheet().getActiveRange().getRow(), 1).getValue(); if (!rid) return { success: false, msg: "ID不明" }; return createReportPdf(rid); } catch (e) { return { success: false, msg: "シート操作エラー" }; } }
function createReportPdf(reportId) {
  try {
    const sh = getSheet('REPORT'); const data = sh.getDataRange().getValues(); const row = data.find(r => String(r[0]) === String(reportId)); if (!row) throw new Error("Data Not Found");
    const d = { date: Utilities.formatDate(new Date(row[1]), CONFIG.TIMEZONE, 'yyyy/MM/dd'), client: row[4], site: row[5], labor: JSON.parse(row[6] || '[]'), resources: JSON.parse(row[7] || '[]'), work: JSON.parse(row[8] || '[]'), exp: JSON.parse(row[9] || '[]'), total: Number(row[11]).toLocaleString(), photos: JSON.parse(row[14] || '[]') };
    let html = `<html><head><style>@page{size:A4 portrait;margin:15mm}body{font-family:Meiryo}.grid{width:100%;border-collapse:collapse;margin-bottom:15px}.grid th,.grid td{border:1px solid #888;padding:6px}.title{font-size:24px;font-weight:bold;margin-bottom:10px}</style></head><body><div class="title">作業日報 (${d.date})</div><div>現場: ${d.site}</div><br><table class="grid"><thead><tr><th>区分</th><th>名称</th><th>数量</th><th>金額</th></tr></thead><tbody>${[...d.labor.map(l => ({ t: '人工', n: l.name, q: l.qty, p: 20000 })), ...d.resources.map(r => ({ t: '資材/機械', n: r.name, q: r.qty, p: r.price })), ...d.exp.map(e => ({ t: '経費', n: e.name, q: 1, p: e.price }))].map(x => `<tr><td>${x.t}</td><td>${x.n}</td><td>${x.q}</td><td>¥${(x.q * x.p).toLocaleString()}</td></tr>`).join('')}</tbody></table><div style="text-align:right;font-size:18px;font-weight:bold">合計: ¥${d.total}</div></body></html>`;
    const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF).setName(`日報_${d.date}.pdf`);
    return { success: true, url: ensureFolder('VΩ_Output_PDFs').createFile(blob).getUrl() };
  } catch (e) { return { success: false, msg: e.toString() }; }
}
function getSheet(k) { const ss = SpreadsheetApp.getActiveSpreadsheet(); for (const n of SHEET_VARIANTS[k]) { const s = ss.getSheetByName(n); if (s) return s; } return ss.insertSheet(SHEET_VARIANTS[k][0]); }

/* ★修正: フォルダ名安全化 */
function ensureFolder(name) {
  if (!name) name = "VΩ_Data";
  let i = PROPS.getProperty('F_' + name); if (i) try { return DriveApp.getFolderById(i); } catch (e) {} const f = DriveApp.createFolder(name); PROPS.setProperty('F_' + name, f.getId()); return f;
}
/* ★修正: 写真フォルダ名安全化 */
function saveImageToDrive(b64, n, d) {
  try {
    const dSafe = String(d).substring(0, 7).replace('/', '-');
    return ensureFolder(`VΩ_Photos_${dSafe}`).createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', `${d}_${n}.jpg`)).getUrl();
  } catch (e) { return ""; }
}

function deleteRowsByCol(s, c, v) { const d = s.getDataRange().getValues(); for (let i = d.length - 1; i >= 1; i--) if (String(d[i][c]) === String(v)) s.deleteRow(i + 1); }
function saveLineConfig(c) { PROPS.setProperties({ LT: c.time, LA: String(c.active) }); return { success: true, msg: "保存" }; }
function getLineConfig() { return { time: PROPS.getProperty('LT') || '17:00', active: PROPS.getProperty('LA') === 'true' }; }
function getReportHistory(y, m) { const sh = getSheet('REPORT'); const data = sh.getDataRange().getValues(); const list = []; for (let i = data.length - 1; i >= 1; i--) { const d = new Date(data[i][1]); if (d.getFullYear() === y && d.getMonth() + 1 === m) list.push({ id: String(data[i][0]), date: Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd'), siteName: data[i][5], total: Number(data[i][11]), status: data[i][10], reporter: JSON.parse(data[i][6] || '[]').map(w => w.name).join(',') }); } return { success: true, list: list }; }
function addMasterData(t, n, s) { getSheet(t === 'client' ? 'CLIENT' : (t === 'site' ? 'SITE' : 'WORKER')).appendRow([Utilities.getUuid(), n, s, '', '', 0]); return { success: true }; }
function getHolidays() { try { const c = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com'); const n = new Date(); return c.getEvents(new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth() + 3, 0)).reduce((a, e) => { a[Utilities.formatDate(e.getStartTime(), CONFIG.TIMEZONE, 'yyyy-MM-dd')] = e.getTitle(); return a; }, {}); } catch (e) { return {}; } }
function getLastReport(siteId) { const sh = getSheet('REPORT'); const data = sh.getDataRange().getValues(); for (let i = data.length - 1; i >= 1; i--) { if (String(data[i][3]) === String(siteId)) { const p = (s) => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } }; return { success: true, data: { labor: p(data[i][6]), materials: p(data[i][7]).filter(x => x.type !== 'machine'), machines: p(data[i][7]).filter(x => x.type === 'machine'), expenses: p(data[i][9]) } }; } } return { success: false, msg: "履歴なし" }; }
function getReportById(id) {
  const sh = getSheet('REPORT'); const data = sh.getDataRange().getValues();
  const row = data.find(r => String(r[0]) === String(id));
  if (!row) return { success: false, msg: "データが見つかりません" };
  const safe = (s) => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } };
  return { success: true, data: { id: row[0], date: Utilities.formatDate(new Date(row[1]), CONFIG.TIMEZONE, 'yyyy-MM-dd'), siteId: row[3], siteName: row[5], labor: safe(row[6]), materials: safe(row[7]).filter(x => x.type === 'material'), machines: safe(row[7]).filter(x => x.type === 'machine'), works: safe(row[8]), expenses: safe(row[9]), totalCost: row[11], weather: row[12], temp: row[13] } };
}
