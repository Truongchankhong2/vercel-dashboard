import fs from 'fs';
import path from 'path';

let cachedData = null;

export default async function handler(req, res) {
  try {
    if (!cachedData) {
      const filePath = path.join(process.cwd(), 'public', 'powerapp.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      cachedData = JSON.parse(rawData);
    }

    const rproList = (req.query?.rpro || '').split('|').map(s => s.trim()).filter(Boolean);
    if (rproList.length === 0) return res.status(200).json([]);

    const filtered = cachedData.filter(row => rproList.includes(row['PRO ODER']?.trim()));
    res.status(200).json(filtered);
  } catch (err) {
    console.error('DETAILS API ERROR:', err);
    res.status(500).json({ error: 'Lỗi server đọc JSON' });
  }
}
