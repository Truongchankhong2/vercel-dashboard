import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

// 1. Đường dẫn tới file Excel
const excelPath = path.join(process.cwd(), 'data', 'Powerapp.xlsx');

// 2. Đọc file Excel
const workbook = xlsx.readFile(excelPath);

// 3. Chọn sheet đầu tiên
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// 4. Convert sang object (dùng header dòng đầu tiên)
const jsonData = xlsx.utils.sheet_to_json(sheet, {
  defval: '',    // giữ ô trống dưới dạng chuỗi rỗng
  raw: false     // định dạng rõ ràng (vd: giữ định dạng ngày/tháng)
});

// 5. Ghi ra file powerapp.json
const outputPath = path.join(process.cwd(), 'data', 'powerapp.json');
fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');

console.log('✅ Đã convert Powerapp.xlsx thành powerapp.json thành công!');
