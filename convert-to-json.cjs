const XLSX = require('xlsx');
const fs = require('fs');

// === 1. Đọc file Excel gốc ===
const wb = XLSX.readFile('./data/Powerapp.xlsx');

// === 2. Tạo powerapp.json từ sheet "Data Power app" ===
const sheetName = 'Data Power app';
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error(`❌ Không tìm thấy sheet "${sheetName}"`);
  process.exit(1);
}

// Đọc thành mảng 2D, giữ cả cột trống và mặc định giá trị rỗng
const data2D = XLSX.utils.sheet_to_json(ws, {
  header: 1,
  blankrows: false,
  defval: ''
});

// Dòng 0 là header
const rawHeaders = data2D[0] || [];
let headersAll = rawHeaders.map(h =>
  typeof h === 'string' ? h.trim() : ''
);

// Loại bỏ header rỗng (nếu có)
headersAll = headersAll.filter(h => h !== '');

// Tách fixedKeys (không phải số) và sizeKeys (là số)
const sizeKeys  = headersAll.filter(h => !isNaN(parseFloat(h)));
const fixedKeys = headersAll.filter(h => isNaN(parseFloat(h)));

// Kết hợp lại: fixedKeys trước, rồi sizeKeys
const finalHeaders = [...fixedKeys, ...sizeKeys];

// Dữ liệu bắt đầu từ dòng 2 (index 1)
const dataRows = data2D.slice(1);
const data = dataRows.map(row => {
  const obj = {};
  finalHeaders.forEach((key, idx) => {
    obj[key] = row[idx];
  });
  return obj;
});

// Ghi ra file powerapp.json
fs.writeFileSync(
  './public/powerapp.json',
  JSON.stringify({ headers: finalHeaders, data }, null, 2),
  'utf-8'
);
console.log(`✅ powerapp.json đã được tạo (${data.length} dòng, ${finalHeaders.length} cột)`);

// === 3. Tạo sizefix.json từ sheet "Size run fix" (dạng pivot) ===
const sizeFixSheet = wb.Sheets['Size run fix'];
if (!sizeFixSheet) {
  console.error("❌ Không tìm thấy sheet 'Size run fix'");
  process.exit(1);
}

const range = XLSX.utils.decode_range(sizeFixSheet['!ref']);
// headerRow = dòng chứa tên size pivot (dòng 2 Excel → index 1)
const headerRow    = range.s.r + 1;
// dataStartRow = dữ liệu bắt đầu từ dòng 3 Excel → index 2
const dataStartRow = headerRow + 1;
const startCol     = range.s.c;  // cột đầu là RPRO
const endCol       = range.e.c;  // cột cuối cùng

const sizeFixData = {};

for (let r = dataStartRow; r <= range.e.r; r++) {
  // ô chứa RPRO ở cột đầu
  const rproCell = sizeFixSheet[
    XLSX.utils.encode_cell({ r, c: startCol })
  ];
  if (!rproCell || !rproCell.v) continue;
  const rpro = rproCell.v.toString().trim();

  const sizes = {};
  // quét các cột size từ startCol+1 → endCol
  for (let c = startCol + 1; c <= endCol; c++) {
    const sizeCell = sizeFixSheet[
      XLSX.utils.encode_cell({ r: headerRow, c })
    ];
    const qtyCell = sizeFixSheet[
      XLSX.utils.encode_cell({ r, c })
    ];

    if (
      !sizeCell ||
      sizeCell.v === undefined ||
      sizeCell.v === '' ||
      !qtyCell ||
      qtyCell.v === undefined ||
      qtyCell.v === ''
    ) {
      continue;
    }

    const size = sizeCell.v.toString().trim();
    const qty  = parseInt(qtyCell.v, 10);
    if (!isNaN(qty) && qty > 0) {
      sizes[size] = qty;
    }
  }

  if (Object.keys(sizes).length > 0) {
    sizeFixData[rpro] = sizes;
  }
}

// Ghi ra file sizefix.json
fs.writeFileSync(
  './public/sizefix.json',
  JSON.stringify(sizeFixData, null, 2),
  'utf-8'
);
console.log(`✅ sizefix.json đã được tạo (${Object.keys(sizeFixData).length} đơn hàng)`);
console.log('✅ Tất cả chuyển đổi hoàn tất.');
