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
  "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5",
  "13", "13.5", "14", "14.5", "15", "15.5", "16", "16.5", "17", "17.5", "18", "18.5",
  "19", "19.5", "20", "20.5", "21", "22", "23", "24", "25", "26", "27", "28",
  "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
  "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "134.9mm*355mm", "134.9mm*355mm"
];

// === 3. Chuyển Supabase key sang cột Excel (size_7_5 → 7.5) ===
function normalizeToExcel(sizeKey) {
  return sizeKey.replace("size_", "").replace("_", ".");
}

// === 4. Đồng bộ Supabase → Excel ===
async function syncToExcel() {
  const { data, error } = await supabase
    .from('supplement')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error("❌ Lỗi Supabase:", error.message);
    return;
  }

  // Mở file Excel
  const filePath = './data/Supplement.xlsx';
  if (!fs.existsSync(filePath)) {
    console.error("❌ Không tìm thấy file:", filePath);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // "Supplement"
  const sheet = workbook.Sheets[sheetName];

  if (!sheet || !sheet['!ref']) {
    console.error("❌ Sheet không tồn tại hoặc không có dữ liệu.");
    return;
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);

  // 🧹 XÓA TẤT CẢ DÒNG DỮ LIỆU CŨ (TỪ DÒNG 2 TRỞ XUỐNG)
  const clearRange = XLSX.utils.decode_range(sheet['!ref']);
  for (let r = 1; r <= clearRange.e.r; r++) {
    for (let c = 0; c <= clearRange.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      delete sheet[cellAddress];
    }
  }

  let startRow = 2; // Bắt đầu từ dòng 2 (sau header)

    while (sheet[`A${startRow}`]) {
      startRow++;
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
      D: row.tool || '',
      E: row.fabric || '',
      F: row.bom || '',
      G: row.total || 0,
      H: createdAtStr
    };

    // 👉 Bắt đầu từ cột I (index 8)
    excelSizeList.forEach((size, idx) => {
      const key = `size_${size.replace('.', '_')}`;
      const val = row[key] || 0;
      const colLetter = XLSX.utils.encode_col(8 + idx);  // I = col 8
      rowData[colLetter] = val;
    });

    // 👉 Ghi từng ô vào sheet
    Object.entries(rowData).forEach(([col, val]) => {
      const cellAddress = `${col}${startRow}`;
      sheet[cellAddress] = {
        t: typeof val === 'number' ? 'n' : 's',
        v: val
      };
    });

    startRow++;
  }

  // Cập nhật lại phạm vi sheet
  const newRange = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: 7 + excelSizeList.length, r: startRow - 1 }
  });
  sheet['!ref'] = newRange;

  // Ghi file
  XLSX.writeFile(workbook, filePath);
  console.log(`✅ Đã đồng bộ ${data.length} dòng từ Supabase → Excel`);
}

syncToExcel();
