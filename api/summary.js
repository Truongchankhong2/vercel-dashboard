import { readExcel } from './utils.js';

export default async function handler(req, res) {
  const data = await readExcel();
  if (data.length <= 1) return res.json([]);

  const map = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const m = String(row[57] || '').trim();
    const q = parseFloat(row[6]) || 0;
    if (m) map[m] = (map[m] || 0) + q;
  }

  res.status(200).json(Object.entries(map).map(([machine, total]) => ({ machine, total })));
}
