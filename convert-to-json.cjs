// convert-to-json.cjs
// Chạy: node convert-to-json.cjs

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1) Đọc workbook
const workbook = XLSX.readFile(
  path.join(__dirname, 'data', 'Powerapp.xlsx')
);

// 2) Chọn sheet (thay 'Sheet1' bằng tên sheet thật)
const SHEET_NAME = 'Sheet1';
const worksheet  = workbook.Sheets[SHEET_NAME];
if (!worksheet) {
  console.error(`Không tìm thấy sheet "${SHEET_NAME}"`);
  process.exit(1);
}

// 3) Chuyển thành JSON
// - range: 1 → bỏ qua row1, dùng row2 làm header (nếu header nằm row2)
// - defval: "" → đảm bảo ô trống vẫn ra chuỗi rỗng
const jsonData = XLSX.utils.sheet_to_json(worksheet, {
  defval: "",
  range: 1,       // header tại row 2 (0-based index)
//raw: false      // (tuỳ chọn) convert số thành number
});

// 4) Ghi ra public/powerapp.json
const outPath = path.join(__dirname, 'public', 'powerapp.json');
fs.writeFileSync(outPath, JSON.stringify(jsonData, null, 2), 'utf-8');
console.log(`Đã xuất ${jsonData.length} dòng JSON → ${outPath}`);
