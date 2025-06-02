import xlsx from 'xlsx';
import path from 'path';
import { promises as fs } from 'fs';

export async function readExcel() {
  const filePath = path.resolve('data', 'Powerapp.xlsx');
  const fileBuffer = await fs.readFile(filePath);
  const wb = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheet = wb.Sheets['Data Power app'];
  return xlsx.utils.sheet_to_json(sheet, { header: 1 });
}
