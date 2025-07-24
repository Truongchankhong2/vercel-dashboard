const XLSX = require('xlsx');
const fs = require('fs');

// === 1. Đọc file Excel gốc ===
const wb = XLSX.readFile('./data/Powerapp.xlsx');

// === 2. Tạo powerapp.json từ sheet đầu tiên ===
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data2D = XLSX.utils.sheet_to_json(ws, { header: 1 });

const rawHeaders = data2D[0] || [];
const headers = rawHeaders.map(h => (typeof h === 'string' ? h.replace(/^#/, '').trim() : ''));

const data = data2D.slice(1).map(row => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx];
  });
  return obj;
});

fs.writeFileSync('./public/powerapp.json', JSON.stringify({ headers, data }, null, 2), 'utf-8');
console.log(`✅ powerapp.json đã được tạo (${data.length} dòng)`);

// === 3. Tạo sizefix.json từ sheet "Size run fix" (dạng pivot) ===
const sizeFixSheet = wb.Sheets["Size run fix"];
if (!sizeFixSheet) {
  console.error("❌ Không tìm thấy sheet 'Size run fix'");
  process.exit(1);
}

const sizeFixRange = XLSX.utils.decode_range(sizeFixSheet["!ref"]);
const sizeFixData = {};

for (let r = sizeFixRange.s.r + 1; r <= sizeFixRange.e.r; r++) {
  const rproCell = sizeFixSheet[XLSX.utils.encode_cell({ r, c: 0 })];
  if (!rproCell || !rproCell.v) continue;

  const rpro = rproCell.v.toString().trim();
  const sizes = {};

  for (let c = 1; c <= sizeFixRange.e.c; c++) {
    const sizeCell = sizeFixSheet[XLSX.utils.encode_cell({ r: sizeFixRange.s.r, c })]; // dòng tiêu đề (dòng 1)
    const qtyCell = sizeFixSheet[XLSX.utils.encode_cell({ r, c })];

    if (!sizeCell || !qtyCell || qtyCell.v === undefined || qtyCell.v === "") continue;

    const size = sizeCell.v.toString().trim();
    const qty = parseInt(qtyCell.v);
    if (!isNaN(qty) && qty > 0) {
      sizes[size] = qty;
    }
  }

  if (Object.keys(sizes).length > 0) {
    sizeFixData[rpro] = sizes;
  }
}

fs.writeFileSync('./public/sizefix.json', JSON.stringify(sizeFixData, null, 2), 'utf-8');
console.log(`✅ sizefix.json đã được tạo (${Object.keys(sizeFixData).length} đơn hàng)`);

console.log("✅ Tất cả chuyển đổi hoàn tất.");
