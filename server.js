// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Supplement route – ghi supplement trực tiếp vào Excel COM
app.post('/supplement', (req, res) => {
  try {
    const { rpro, metadata, details, total } = req.body;
    const BASE_DIR    = path.join(__dirname, 'data');
    const SUPP_PATH   = path.join(BASE_DIR, 'Supplement.xlsx');
    const sheetName   = 'Supplement';

    // 1) Mở workbook nếu có, hoặc tạo mới
    let wb;
    if (fs.existsSync(SUPP_PATH)) {
      wb = XLSX.readFile(SUPP_PATH);
    } else {
      wb = XLSX.utils.book_new();
    }

    // 2) Lấy hoặc tạo sheet
    let ws = wb.Sheets[sheetName];
    if (!ws) {
      // Header mặc định
      const header = [
        'RPRO',
        'Giới tính',
        'Mã khuôn',
        'Mã dao',
        'Tên vải',
        'BOM',
        'Total',
        ...Object.keys(details)
      ];
      ws = XLSX.utils.aoa_to_sheet([header]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // 3) Đọc sheet thành 2D-array, thêm dòng mới
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

    // 4) Ghi lại sheet và save
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(data2D);
    XLSX.writeFile(wb, SUPP_PATH);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ [SUPPLEMENT] Error saving to Supplement.xlsx:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
