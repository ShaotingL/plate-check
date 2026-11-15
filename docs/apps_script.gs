/**
 * 車牌名單比對 — Google 試算表接收端（Apps Script）
 *
 * 功能：
 *   1. 接收手機上傳的掃描結果：在「掃描紀錄」新增一列，名單內的車在「名單」標成「已到」
 *   2. 讓手機從「名單」工作表載入名單（設定 → 從 Google 試算表載入）
 *
 * 「名單」工作表欄位（第一次執行會自動建立）：
 *   A 車牌 ｜ B 顯示內容 ｜ C 狀態 ｜ D 首次掃描時間 ｜ E 最近掃描時間 ｜ F 掃描次數
 *   你只要填 A、B 兩欄；一格可填多組車牌，用「、」分隔
 *
 * 安裝：
 *   1. 把下面的 TOKEN 改成你自己的密碼
 *   2. 部署 → 新增部署作業 → 網頁應用程式；執行身分「我」、存取權「所有人」
 *   3. 把網址和密碼填進手機 app 的「設定 → Google 試算表同步」
 */

// 存取密碼：一定要改。手機 app 要填同一組密碼才能讀寫
const TOKEN = '請改成自己的密碼';

/** 檢查密碼（還沒改預設值時一律拒絕） */
function allowed_(token) {
  return TOKEN !== '請改成自己的密碼' && token === TOKEN;
}

/** 取得工作表，不存在就建立並寫入標題列 */
function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
const ROSTER_HEAD = ['車牌', '顯示內容', '狀態', '首次掃描時間', '最近掃描時間', '掃描次數'];
const LOG_HEAD = ['掃描時間', '辨識車牌', '結果', '對應名單車牌', '裝置'];

/** 接收手機上傳（POST，JSON：{token, device, items:[{t, read, plate, inList}]}） */
function doPost(e) {
  const lock = LockService.getScriptLock();   // 多支手機同時上傳時排隊，避免互相覆蓋
  lock.waitLock(15000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!allowed_(data.token)) return reply_({ ok: false, error: '密碼錯誤，或 Apps Script 裡的 TOKEN 還沒改' });

    const roster = sheet_('名單', ROSTER_HEAD);
    const log = sheet_('掃描紀錄', LOG_HEAD);
    const items = data.items || [];
    const n = Math.max(roster.getLastRow() - 1, 0);
    const range = n ? roster.getRange(2, 1, n, 6) : null;
    const rows = n ? range.getValues() : [];
    const logRows = [];

    items.forEach(function (it) {
      const t = new Date(it.t || Date.now());
      logRows.push([t, it.read || '', it.inList ? '名單內' : '不在名單', it.plate || '', data.device || '']);
      if (!it.inList || !it.plate) return;
      const key = norm_(it.plate);
      rows.forEach(function (r) {
        const plates = String(r[0]).split(/[、\/;；,，]/).map(norm_);   // A 欄可有多組車牌
        if (plates.indexOf(key) < 0) return;
        r[2] = '已到';                          // C 狀態
        if (!r[3]) r[3] = t;                    // D 首次掃描時間
        r[4] = t;                               // E 最近掃描時間
        r[5] = (Number(r[5]) || 0) + 1;         // F 掃描次數
      });
    });

    if (n) {
      range.setValues(rows);
      roster.getRange(2, 4, n, 2).setNumberFormat('yyyy/mm/dd hh:mm:ss');
    }
    if (logRows.length) {
      const start = log.getLastRow() + 1;
      log.getRange(start, 1, logRows.length, 5).setValues(logRows);
      log.getRange(start, 1, logRows.length, 1).setNumberFormat('yyyy/mm/dd hh:mm:ss');
    }
    return reply_({ ok: true, saved: items.length });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** GET：連線測試；帶 action=roster 與正確密碼時回傳名單（A、B 兩欄） */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'roster') {
    if (!allowed_(p.token)) return reply_({ ok: false, error: '密碼錯誤，或 Apps Script 裡的 TOKEN 還沒改' });
    const roster = sheet_('名單', ROSTER_HEAD);
    const n = Math.max(roster.getLastRow() - 1, 0);
    const rows = n ? roster.getRange(2, 1, n, 2).getDisplayValues().filter(function (r) { return r[0]; }) : [];
    return reply_({ ok: true, rows: rows });
  }
  return reply_({ ok: true, msg: '接收端運作中' });
}

/** 車牌正規化：大寫、只保留英數字（與手機 app 相同規則） */
function norm_(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** 回傳 JSON */
function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 活動前重設：清空狀態、掃描時間與掃描紀錄（在編輯器手動執行） */
function resetAll() {
  const roster = sheet_('名單', ROSTER_HEAD);
  const n = roster.getLastRow() - 1;
  if (n > 0) roster.getRange(2, 3, n, 4).clearContent();
  const log = sheet_('掃描紀錄', LOG_HEAD);
  if (log.getLastRow() > 1) log.getRange(2, 1, log.getLastRow() - 1, 5).clearContent();
}
