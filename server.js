import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

import dataRouter from './api/data.js';
import detailsRouter from './api/details.js';
import summaryRouter from './api/summary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());                // parse JSON bodies
app.use(express.static(path.join(__dirname, 'public')));

// Existing API routes
app.use('/api/data', dataRouter);
app.use('/api/details', detailsRouter);
app.use('/api/summary', summaryRouter);

// Serve index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Supplement route: receive form data and append to Excel
app.post('/supplement', (req, res) => {
  try {
    const { rpro, metadata, details, total } = req.body;
    const EXCEL_PATH = path.join(__dirname, 'data', 'Powerapp.xlsx');
    const workbook = XLSX.readFile(EXCEL_PATH);

    const sheetName = 'Supplement';
    let ws = workbook.Sheets[sheetName];
    // If sheet doesn't exist, create with header row
    if (!ws) {
      const headerRow = [
        'RPRO',
        'Giới tính',
        'Mã khuôn',
        'Mã dao',
        'Tên vải',
        'BOM',
        'Total',
        ...Object.keys(details)
      ];
      ws = XLSX.utils.aoa_to_sheet([headerRow]);
      workbook.SheetNames.push(sheetName);
      workbook.Sheets[sheetName] = ws;
    }

    // Convert sheet to array-of-arrays, append new row
    const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 });
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
    sheetData.push(newRow);

    // Write back and save
    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.writeFile(workbook, EXCEL_PATH);

    res.sendStatus(200);
  } catch (err) {
    console.error('Error in /supplement:', err);
    res.sendStatus(500);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
