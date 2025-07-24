const XLSX = require('xlsx');
const fs = require('fs');

// === 1. Đọc file Excel gốc ===
const wb = XLSX.readFile('./data/Powerapp.xlsx');

// === 2. Tạo powerapp.json từ sheet đầu tiên ===
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data2D = XLSX.utils.sheet_to_json(ws, { header: 1 });

const rawHeaders = data2D[0] || [];
const headers = rawHeaders.map(h =>
  typeof h === 'string' ? h.replace(/^#/, '').trim() : ''
);

const data = data2D.slice(1).map(row => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx];
  });
  return obj;
});

fs.writeFileSync(
  './public/powerapp.json',
  JSON.stringify({ headers, data }, null, 2),
  'utf-8'
);
console.log(`✅ powerapp.json đã được tạo (${data.length} dòng)`);

// === 3. Tạo sizefix.json từ sheet "Size run fix" (dạng pivot) ===
const sizeFixSheet = wb.Sheets['Size run fix'];
if (!sizeFixSheet) {
  console.error("❌ Không tìm thấy sheet 'Size run fix'");
  process.exit(1);
}

const range = XLSX.utils.decode_range(sizeFixSheet['!ref']);
// Định nghĩa:
const headerRow = range.s.r + 1;      // dòng 2 (index base-0 là s.r=0 → headerRow=1)
const dataStartRow = headerRow + 1;   // dữ liệu từ dòng 3 (index=2)
const startCol = range.s.c;           // cột đầu (RPRO)
const endCol = range.e.c;             // cột cuối cùng

const sizeFixData = {};

for (let r = dataStartRow; r <= range.e.r; r++) {
  // ô RPRO ở cột đầu
  const rproCell = sizeFixSheet[
    XLSX.utils.encode_cell({ r, c: startCol })
  ];
  if (!rproCell || !rproCell.v) continue;
  const rpro = rproCell.v.toString().trim();

  const sizes = {};
  // quét từng cột size từ c=startCol+1 → endCol
  for (let c = startCol + 1; c <= endCol; c++) {
    // ô header chứa tên size ở headerRow
    const sizeCell = sizeFixSheet[
      XLSX.utils.encode_cell({ r: headerRow, c })
    ];
    // ô qty tại hàng r, cột c
    const qtyCell = sizeFixSheet[
      XLSX.utils.encode_cell({ r, c })
    ];

    if (
      !sizeCell ||
      !sizeCell.v ||
      !qtyCell ||
      qtyCell.v === undefined ||
      qtyCell.v === ''
    ) {
      continue;
    }

    const size = sizeCell.v.toString().trim();
    const qty = parseInt(qtyCell.v, 10);
    if (!isNaN(qty) && qty > 0) {
      sizes[size] = qty;
    }
  }

  if (Object.keys(sizes).length > 0) {
    sizeFixData[rpro] = sizes;
  }
}

fs.writeFileSync(
  './public/sizefix.json',
  JSON.stringify(sizeFixData, null, 2),
  'utf-8'
);
console.log(
  `✅ sizefix.json đã được tạo (${Object.keys(sizeFixData).length} đơn hàng)`
);

console.log('✅ Tất cả chuyển đổi hoàn tất.');
