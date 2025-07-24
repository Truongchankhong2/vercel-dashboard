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

// === 3. Tạo sizefix.json từ sheet "Size run fix" ===
const sizeFixSheet = wb.Sheets["Size run fix"];
if (!sizeFixSheet) {
  console.error("❌ Không tìm thấy sheet 'Size run fix'");
  process.exit(1);
}

const sizeFixRange = XLSX.utils.decode_range(sizeFixSheet["!ref"]);
const sizeFixData = {};

for (let r = 2; r <= sizeFixRange.e.r; r++) { // Dòng bắt đầu từ dòng 3 (index 2)
  const rproCell = sizeFixSheet[`A${r + 1}`];
  const genderCell = sizeFixSheet[`B${r + 1}`];
  if (!rproCell || !genderCell || genderCell.v !== "Women's") continue;

  const rpro = rproCell.v;
  const sizes = {};

  for (let c = 2; c <= sizeFixRange.e.c; c++) { // Size từ cột C (index 2)
    const sizeHeaderCell = sizeFixSheet[XLSX.utils.encode_cell({ r: 1, c })];
    const valCell = sizeFixSheet[XLSX.utils.encode_cell({ r, c })];

    if (!sizeHeaderCell || !valCell || valCell.v === undefined || valCell.v === "") continue;

    const size = sizeHeaderCell.v.toString().trim();
    const qty = parseInt(valCell.v);
    if (!isNaN(qty) && qty > 0) {
      sizes[size] = qty;
    }
  }

  if (Object.keys(sizes).length > 0) {
    sizeFixData[rpro] = sizes;
  }
}

// Ghi ra file JSON
fs.writeFileSync('./public/sizefix.json', JSON.stringify(sizeFixData, null, 2), 'utf-8');
console.log(`✅ Đã tạo file sizefix.json từ sheet "Size run fix" (${Object.keys(sizeFixData).length} đơn hàng)`);


console.log("✅ Tất cả chuyển đổi hoàn tất.");
