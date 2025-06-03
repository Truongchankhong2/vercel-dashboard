// convert-to-json.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// __dirname tự động có trong CommonJS
const workbook = XLSX.readFile(path.join(__dirname, 'data', 'powerapp.xlsx'));
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

fs.writeFileSync(
  path.join(__dirname, 'public', 'powerapp.json'),
  JSON.stringify(jsonData, null, 2),
  'utf-8'
);

console.log("Đã chuyển powerapp.xlsx thành public/powerapp.json");
