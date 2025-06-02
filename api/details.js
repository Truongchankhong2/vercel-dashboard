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
  const data = rows.slice(1);

  const machineIndex = headers.indexOf('Máy');
  const puIndex = headers.indexOf('PU');
  const quantityIndex = headers.indexOf('Sản lượng');

  const grouped = {};

  for (const row of data) {
    const machine = row[machineIndex];
    const pu = row[puIndex];
    const qty = parseInt(row[quantityIndex], 10) || 0;

    if (!grouped[machine]) grouped[machine] = {};

    if (!grouped[machine][pu]) grouped[machine][pu] = [];

    grouped[machine][pu].push(row);
  }

  res.status(200).json({ headers, grouped });
}
