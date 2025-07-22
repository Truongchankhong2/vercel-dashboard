// convert-to-json.cjs
// Chạy: node convert-to-json.cjs
// → public/powerapp.json sẽ được cập nhật đúng cột size

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

// 1) Đọc workbook và sheet đầu tiên
const wb = XLSX.readFile(path.join(__dirname, 'data', 'Powerapp.xlsx'));
const sheetName = wb.SheetNames[0];
const ws        = wb.Sheets[sheetName];
if (!ws) {
  console.error(`❌ Không tìm thấy sheet: ${sheetName}`);
  process.exit(1);
}

// 2) Đọc toàn bộ sheet làm array-of-arrays
const allRows = XLSX.utils.sheet_to_json(ws, {
  header: 1,
  defval: ""     // ô trống → ""
});

// 3) Tìm header row (phải có cả STT và PRO ODER)
let hdrIdx = allRows.findIndex(r => 
  r.includes("STT") && r.includes("PRO ODER")
);
if (hdrIdx < 0) {
  console.warn("⚠️ Không tìm thấy header row; dùng dòng 0 làm header");
  hdrIdx = 0;
}

// 4) Lấy mảng header, đảm bảo mỗi phần tử đều có tên key
const rawHeader = allRows[hdrIdx];
const headers = rawHeader.map((h, i) => {
  const txt = (h||"").toString().trim();
  return txt !== "" ? txt : `col${i}`;
});

// 5) Đọc lại sheet thành JSON, ép theo headers và bắt đầu từ dòng data
const jsonData = XLSX.utils.sheet_to_json(ws, {
  header: headers,
  defval: "",
  range: hdrIdx + 1   // bỏ qua row header
});

// 6) Xuất ra public/powerapp.json
const outPath = path.join(__dirname, 'public', 'powerapp.json');
fs.writeFileSync(outPath, JSON.stringify(jsonData, null, 2), 'utf-8');
console.log(`✅ Đã xuất ${jsonData.length} dòng JSON → ${outPath}`);
