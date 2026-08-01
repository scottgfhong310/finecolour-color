/**
 * finecolour-color — 獨立執行的 Express 伺服器
 *
 * 唯讀參考工具：Finecolour 色號 → CSS（hex / var / rgb / utility class）對照。
 * 528 色與 43 組套組是靜態 registry（public/apps/finecolour-color/data/finecolour-*.js，
 * 由家族美術色材領域庫 db_artcolor 匯出），不需上傳/編輯，故**後端無 API**——
 * 只負責靜態檔、根路徑轉址、JSON 404。app 本身不連任何資料庫。
 *
 * 啟動： npm install && npm start
 *        預設 http://localhost:3000/apps/finecolour-color/
 */

const express = require('express');
const path = require('path');
const logger = require('morgan');

const app = express();

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// 根路徑導向應用頁
app.get('/', (req, res) => res.redirect('/apps/finecolour-color/'));

// 404（API 回 JSON，其餘回純文字）
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'Not found' });
  res.status(404).type('text/plain').send('Not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`finecolour-color →  http://localhost:${PORT}/apps/finecolour-color/`);
});
