// server.js

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';                           // ← Thêm import xlsx

import dataRouter from './api/data.js';
import detailsRouter from './api/details.js';
import summaryRouter from './api/summary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());                           // ← Đảm bảo parse JSON body

// API routes
app.use('/api/data', dataRouter);
app.use('/api/details', detailsRouter);
app.use('/api/summary', summaryRouter);

// Trang chính và static files
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Route mới cho Bù hàng ─────────────────────────
// Nhận dữ liệu bù hàng từ client và ghi vào sheet "Supplement"
app.post('/supplement', (req, res) => {
  try {
    const { rpro, metadata, details, total } = req.body;

    // Đường dẫn tới file Excel
    const EXCEL_PATH = path.resolve(__dirname, 'data', 'Powerapp.xlsx');

    // Đọc workbook
    const wb = XLSX.readFile(EXCEL_PATH);

    const sheetName = 'Supplement';
    let ws = wb.Sheets[sheetName];

    // Nếu chưa có sheet, tạo mới với header
    if (!ws) {
      const headers = [
        'RPRO', 'Giới tính', 'Mã khuôn', 'Mã dao', 'Tên vải', 'BOM', 'Total',
        ...Object.keys(details)
      ];
      ws = XLSX.utils.aoa_to_sheet([headers]);
      wb.SheetNames.push(sheetName);
      wb.Sheets[sheetName] = ws;
    }

    // Chuyển sheet sang mảng 2D
    const arr = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Tạo dòng mới
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
    arr.push(newRow);

    // Ghi ngược lại sheet và lưu file
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(arr);
    XLSX.writeFile(wb, EXCEL_PATH);

    return res.sendStatus(200);
  } catch (err) {
    console.error('Error in /supplement:', err);
    return res.sendStatus(500);
  }
});
// ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please free it or try another port.`);
    process.exit(1);
  } else {
    throw err;
  }
});
