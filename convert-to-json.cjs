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


// === Size run fix → sizefix.json ===
const sizeFixSheet = workbook.Sheets["Size run fix"];
if (!sizeFixSheet) {
  console.error("❌ Không tìm thấy sheet 'Size run fix'");
  process.exit(1);
}

const sizeFixRange = XLSX.utils.decode_range(sizeFixSheet["!ref"]);
const sizeFixData = {};

for (let r = 2; r <= sizeFixRange.e.r; r++) { // Bắt đầu từ dòng 3
  const rproCell = sizeFixSheet[`A${r + 1}`];
  if (!rproCell) continue;
  const rpro = rproCell.v;
  const sizes = {};

  for (let c = 1; c <= sizeFixRange.e.c; c++) { // Bắt đầu từ cột B (1)
    const sizeLabelCell = sizeFixSheet[XLSX.utils.encode_cell({ r: 1, c })]; // Dòng tiêu đề size (row 2)
    const valCell = sizeFixSheet[XLSX.utils.encode_cell({ r, c })];

    if (!sizeLabelCell || !valCell || valCell.v === undefined || valCell.v === "") continue;

    const size = sizeLabelCell.v.toString().trim();
    const qty = parseInt(valCell.v);
    if (!isNaN(qty) && qty > 0) {
      sizes[size] = qty;
    }
  }

  if (Object.keys(sizes).length > 0) {
    sizeFixData[rpro] = sizes;
  }
}

// Lưu ra file sizefix.json
fs.writeFileSync('./public/sizefix.json', JSON.stringify(sizeFixData, null, 2), 'utf-8');
console.log(`✅ Đã tạo file sizefix.json từ sheet "Size run fix" (${Object.keys(sizeFixData).length} đơn hàng)`);


// 5. Ghi ra file powerapp.json
fs.writeFileSync('./public/powerapp.json', JSON.stringify({ headers, data }, null, 2), 'utf-8');

console.log(`✅ Chuyển đổi thành công! Đã tạo: public/powerapp.json`);
