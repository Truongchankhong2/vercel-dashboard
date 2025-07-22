import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();
app.use(cors());
app.use(express.json());

app.post('/supplement', (req, res) => {
  try {
    const { rpro, metadata, details, total } = req.body;
    const EXCEL_PATH = path.resolve(__dirname, 'data', 'Powerapp.xlsx');
    const tmpVbs     = path.resolve(__dirname, 'tmp_supplement.vbs');

    // 1) Tạo mảng headers và values
    const cols = [
      'RPRO','Giới tính','Mã khuôn','Mã dao','Tên vải','BOM','Total',
      ...Object.keys(details)
    ];
    const vals = [
      rpro,
      metadata.gender,
      metadata.mold,
      metadata.tool,
      metadata.fabric,
      metadata.bom,
      total,
      ...Object.values(details)
    ];

    // 2) Sinh script VBScript
    const vbs = [];
    vbs.push(`Set xl = CreateObject("Excel.Application")`);
    vbs.push(`xl.DisplayAlerts = False`);
    vbs.push(`Set wb = xl.Workbooks.Open("${EXCEL_PATH.replace(/"/g,'""')}")`);
    vbs.push(`On Error Resume Next`);
    vbs.push(`Set ws = wb.Sheets("Supplement")`);
    vbs.push(`If ws Is Nothing Then`);
    vbs.push(`  Set ws = wb.Sheets.Add(After:=wb.Sheets(wb.Sheets.Count))`);
    vbs.push(`  ws.Name = "Supplement"`);
    // viết header lên row 1
    vbs.push(`  ws.Range(ws.Cells(1,1), ws.Cells(1,${cols.length})).Value = Array(${cols.map(c => `"${c.replace(/"/g,'""')}"`).join(',')})`);
    vbs.push(`End If`);
    // tìm dòng cuối và ghi giá trị
    vbs.push(`lr = ws.Cells(ws.Rows.Count,1).End(-4162).Row + 1`);
    vals.forEach((v, i) => {
      const colIdx = i+1;
      const safe   = v.toString().replace(/"/g,'""');
      vbs.push(`ws.Cells(lr,${colIdx}).Value = "${safe}"`);
    });
    vbs.push(`wb.Save`);
    vbs.push(`wb.Close False`);
    vbs.push(`xl.Quit`);

    // 3) Lưu script tạm và chạy
    writeFileSync(tmpVbs, vbs.join('\r\n'), 'utf-16le');  // Excel COM cần UTF-16LE
    execSync(`cscript //NoLogo "${tmpVbs}"`);
    unlinkSync(tmpVbs);

    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ [SUPPLEMENT] COM save error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Server running on 3001'));
