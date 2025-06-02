import { readExcel } from './utils.js';

export default async function handler(req, res) {
  const { machine } = req.query;
  if (!machine) return res.status(400).json({ error: 'Thiếu máy' });

  const data = await readExcel();
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if ((row[57] || '').trim() === machine) {
      result.push({
        order: row[2] || '',
        brandCode: row[3] || '',
        productType: row[5] || '',
        quantity: parseFloat(row[6]) || 0,
        pu: row[36] || ''
      });
    }
  }

  res.status(200).json(result);
}
