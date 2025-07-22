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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /supplement
app.post('/supplement', (req, res) => {
  try {
    const { rpro, metadata, details, total } = req.body;
    const SUPP_PATH = path.join(__dirname, 'data', 'Supplement.xlsx');
    const SHEET     = 'Supplement';

    if (!fs.existsSync(SUPP_PATH)) {
      return res.status(500).json({ error: 'File Supplement.xlsx không tồn tại' });
    }

    // 1) Mở workbook và sheet
    const wb = XLSX.readFile(SUPP_PATH);
    const ws = wb.Sheets[SHEET];
    if (!ws) {
      return res.status(500).json({ error: `Không tìm thấy sheet "${SHEET}"` });
    }

    // 2) Đọc header row (dòng 1)
    const headerRow = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      range: 0,    // chỉ row 0
      raw: true
    })[0];

    // 3) Xác định chỉ số dòng mới
    const dataRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const newRowIndex = dataRows.length; // luôn bắt đầu từ dòng 2 trở đi (vì dòng 0 là tiêu đề)


    // 4) Tạo map tên cột → giá trị
    const cellMap = {
      'RPRO':           rpro,
      'PRO ODER':      rpro,       // nếu header cũ vẫn còn
      'Giới tính':     metadata.gender,
      'Mã khuôn':      metadata.mold,
      'Mã dao':        metadata.tool,
      'Tên vải':       metadata.fabric,
      'FB DESCRIPTION':metadata.fabric,
      'BOM':           metadata.bom,
      'Total':         total,
      'TOTAL':         total       // nếu có header viết hoa
    };

    // 5) Ghi từng cell dựa lên headerRow
    // Ghi từng cell vào dòng tiếp theo sau header
    headerRow.forEach((hdr, colIdx) => {
      let value;
      if (cellMap.hasOwnProperty(hdr)) {
        value = cellMap[hdr];
      } else if (typeof hdr === 'string' && hdr.startsWith('#')) {
        const sizeKey = hdr.slice(1);
        value = details[sizeKey] || 0;
      }

      if (value !== undefined) {
        const cellRef = XLSX.utils.encode_cell({ r: newRowIndex, c: colIdx });
        ws[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
      }
    });

    // Cập nhật vùng dữ liệu !ref thủ công theo dòng cuối mới
    const finalCol = headerRow.length - 1;
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: newRowIndex, c: finalCol }
    });


        // 7) Lưu file
    XLSX.writeFile(wb, SUPP_PATH);

    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ [SUPPLEMENT] Error writing row:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
