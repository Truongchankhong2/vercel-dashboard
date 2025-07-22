const XLSX = require('xlsx');
const fs   = require('fs');

// 1. Đọc file Excel
const wb = XLSX.readFile('./data/Powerapp.xlsx');
const sheetName = wb.SheetNames[0]; // sheet đầu tiên
const ws = wb.Sheets[sheetName];

// 2. Chuyển thành mảng 2 chiều
const data2D = XLSX.utils.sheet_to_json(ws, { header: 1 });

// 3. Dòng đầu tiên là header
const rawHeaders = data2D[0] || [];
const headers = rawHeaders.map(h => (typeof h === 'string' ? h.replace(/^#/, '').trim() : ''));

// 4. Chuyển từng dòng thành object theo headers
const data = data2D.slice(1).map(row => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx];
  });
  return obj;
});

// 5. Ghi ra file powerapp.json
fs.writeFileSync('./public/powerapp.json', JSON.stringify({ headers, data }, null, 2), 'utf-8');

console.log(`✅ Chuyển đổi thành công! Đã tạo: public/powerapp.json`);
