// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// POST /supplement — lưu Supplement lên Supplement.xlsx
app.post('/supplement', (req, res) => {
  try {
    const { rpro, metadata, details, total } = req.body;

    // Đường dẫn tới file Supplement.xlsx (tạo mới nếu chưa có)
    const BASE_DIR  = path.join(__dirname, 'data');
    const SUPP_PATH = path.join(BASE_DIR, 'Supplement.xlsx');
    const sheetName = 'Supplement';

    // 1) Mở workbook nếu tồn tại, hoặc tạo mới
    let wb;
    if (fs.existsSync(SUPP_PATH)) {
      wb = XLSX.readFile(SUPP_PATH);
    } else {
      wb = XLSX.utils.book_new();
    }

    // 2) Lấy hoặc tạo sheet "Supplement"
    let ws = wb.Sheets[sheetName];
    if (!ws) {
      const header = [
        'RPRO',
        'Giới tính',
        'Mã khuôn',
        'Mã dao',
        'Tên vải',
        'BOM',
        'Total',
        ...Object.keys(details)  // tên các cột size
      ];
      ws = XLSX.utils.aoa_to_sheet([header]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // 3) Đọc sheet thành mảng 2D và append row mới
    const data2D = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const newRow = [
      rpro,
      metadata.gender,
      metadata.mold,
      metadata.tool,
      metadata.fabric,
      metadata.bom,
      total,
      ...Object.values(details)
    ];
    data2D.push(newRow);

    // 4) Ghi lại sheet và lưu file
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(data2D);
    XLSX.writeFile(wb, SUPP_PATH);

    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ [SUPPLEMENT] Error saving to Supplement.xlsx:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
