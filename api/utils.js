import fs from 'fs';
import XLSX from 'xlsx';

export async function readExcel() {
  const workbook = XLSX.readFile('./data/Powerapp.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return data;
}
