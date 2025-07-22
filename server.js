// server.js (chỉ phần supplement)

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/supplement', (req, res) => {
  try {
    const { rpro, metadata, details, total } = req.body;

    // 1) File và sheet
    const BASE_DIR  = path.join(__dirname, 'data');
    const SUPP_PATH = path.join(BASE_DIR, 'Supplement.xlsx');
    const sheetName = 'Supplement';

    // 2) Tạo header keys (chính là tên cột) và mới data array
    const headerKeys = [
      'RPRO',
      'Giới tính',
      'Mã khuôn',
      'Mã dao',
      'Tên vải',
      'BOM',
      'Total',
      ...Object.keys(details).map(sz => `#${sz}`)
    ];

    // 3) Load existing data (nếu có) dưới dạng array of objects
    let existing = [];
    if (fs.existsSync(SUPP_PATH)) {
      const wb = XLSX.readFile(SUPP_PATH);
      const ws = wb.Sheets[sheetName];
      if (ws) {
        // range:1 để skip header row
        existing = XLSX.utils.sheet_to_json(ws, {
          header: headerKeys,
          range: 1,       // bắt đầu lấy từ row2
          defval: ''      // thay null/undefined bằng ''
        });
      }
    }

    // 4) Tạo record mới (object)
    const newRec = {
      RPRO: rpro,
      'Giới tính': metadata.gender,
      'Mã khuôn': metadata.mold,
      'Mã dao': metadata.tool,
      'Tên vải': metadata.fabric,
      BOM: metadata.bom,
      Total: total
    };
    // thêm từng size
    Object.keys(details).forEach(sz => {
      newRec[`#${sz}`] = details[sz];
    });

    // 5) Ghép lại mảng và chuyển thành worksheet
    const allRecs = [ ...existing, newRec ];
    const newWs   = XLSX.utils.json_to_sheet(allRecs, { header: headerKeys });

    // 6) Viết vào workbook
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newWs, sheetName);
    XLSX.writeFile(newWb, SUPP_PATH);

    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ [SUPPLEMENT] Error saving:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Server running on 3001'));
