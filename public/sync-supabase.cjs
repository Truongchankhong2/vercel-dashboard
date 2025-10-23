// ✅ Sử dụng require thay vì import
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const { DateTime } = require("luxon");

// === 1. Khai báo Supabase ===
const supabase = createClient(
  'https://ixdtdrbytwdmnlqgunzu.supabase.co',     // 🔁 Thay bằng URL của bạn
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZHRkcmJ5dHdkbW5scWd1bnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMzkyODYsImV4cCI6MjA2ODgxNTI4Nn0.5FLdLDf0d1yA70UBmAbJYW95kVWdta31QmEjm9oX4jg'                  // 🔁 Thay bằng anon key của bạn
);

// === 2. Danh sách cột Size (tên cột trong Excel) ===
const excelSizeList = [
  "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5",
  "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5",
  "12", "12.5", "13", "13.5", "14", "14.5", "15", "15.5", "16", "16.5",
  "17", "17.5", "18", "18.5", "19", "19.5", "20"
];

// === 3. Hàm chính ===
async function exportSupplementToExcel() {
  console.log("Đang tải file template...");
  const templatePath = './template/template_supplement.xlsx';
  const templateBuf = fs.readFileSync(templatePath);
  const wb = XLSX.read(templateBuf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  // (Bỏ qua 2 dòng header)
  let startRow = 3;

  console.log("Đang lấy dữ liệu từ Supabase...");
  const { data, error } = await supabase
    .from('supplement')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    return;
  }

  console.log(`Lấy thành công ${data.length} dòng.`);

  // Xóa các dòng cũ (nếu có)
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let R = range.e.r; R >= startRow -1; R--) {
    delete sheet[R];
  }

  for (const row of data) {
    // 👉 Chuyển UTC → giờ Việt Nam (cộng 7 tiếng)
    const createdAtStr = DateTime
    .fromISO(row.created_at, { zone: 'utc' })  // đọc từ UTC
    .setZone('Asia/Ho_Chi_Minh')              // đổi sang giờ VN
    .toFormat('dd/MM/yyyy HH:mm:ss');         // định dạng theo yêu cầu


    // 👉 Khởi tạo object theo cột A → H
    const rowData = {
      A: row.rpro || '',
      B: row.gender || '',
      C: row.mold || '',
      D: row.tool || '',    // (Lưu ý: code frontend ko có cột 'tool', cột này sẽ rỗng)
      E: row.fabric || '',
      F: row.bom || '',
      G: row.total || 0,
      H: createdAtStr
    };

    // 👉 Bắt đầu từ cột I (index 8)
    excelSizeList.forEach((size, idx) => {
      // SỬA LỖI NULL: Thêm lại hàm chuẩn hóa key
      const key = `size_${size.replace('.', '_')}`;
      const val = row[key] || 0;
      const colLetter = XLSX.utils.encode_col(8 + idx);  // I = col 8
      rowData[colLetter] = val;
    });

    // 👉 Ghi từng ô vào sheet
    Object.entries(rowData).forEach(([col, val]) => {
      const cellAddress = `${col}${startRow}`;
      sheet[cellAddress] = {
        t: (typeof val === 'number') ? 'n' : 's',
        v: val
      };
    });
    startRow++;
  }

  // Cập nhật lại range
  range.e.r = startRow - 1;
  sheet['!ref'] = XLSX.utils.encode_range(range);

  // === 4. Ghi file ===
  const outPath = './public/SUPPLEMENT_EXPORT.xlsx';
  XLSX.writeFile(wb, outPath);
  console.log(`✅ Xuất file thành công: ${outPath}`);
}

// Chạy hàm
exportSupplementToExcel();