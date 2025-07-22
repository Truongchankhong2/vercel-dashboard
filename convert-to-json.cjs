// convert-to-json.cjs
// Chạy: node convert-to-json.cjs
// → public/powerapp.json sẽ chứa { headers: [...], data: [...] }

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'data', 'Powerapp.xlsx'));
const sheetName = wb.SheetNames[0];
const ws        = wb.Sheets[sheetName];

// 1) Đọc toàn bộ sheet thành array-of-arrays
const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// 2) Tìm row header (có STT + PRO ODER)
let hdrIdx = all.findIndex(r => r.includes("STT") && r.includes("PRO ODER"));
if (hdrIdx < 0) {
  console.warn("Không tìm thấy header row, dùng row 0");
  hdrIdx = 0;
}

// 3) Lấy rawHeader và chuẩn hóa thành header array
const rawHeader = all[hdrIdx];
const headers = rawHeader.map((h, i) => {
  const txt = (h||"").toString().trim();
  return txt !== "" ? txt : `col${i}`;
});

// 4) Đọc lại sheet thành JSON, ép theo headers, bắt đầu từ dòng data
const jsonData = XLSX.utils.sheet_to_json(ws, {
  header: headers,
  defval: "",
  range: hdrIdx + 1
});

// 5) Xuất ra public/powerapp.json
const outPath = path.join(__dirname, 'public', 'powerapp.json');
fs.writeFileSync(
  outPath,
  JSON.stringify({ headers, data: jsonData }, null, 2),
  'utf-8'
);
console.log(`Đã xuất ${jsonData.length} dòng → ${outPath}`);
