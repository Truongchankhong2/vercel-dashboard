import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'data', 'powerapp.json');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const rows = JSON.parse(raw);

  const headers = rows[0];
  const colIndex = {
    machine: headers.indexOf('Máy'),
    quantity: headers.indexOf('Sản lượng')
  };

  const result = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const machine = row[colIndex.machine];
    const qty = parseInt(row[colIndex.quantity], 10) || 0;

    if (!result[machine]) result[machine] = 0;
    result[machine] += qty;
  }

  res.status(200).json(result);
}
