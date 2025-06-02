import data from '../data/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
  // Trả về toàn bộ raw data dưới dạng mảng mảng
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(500).json({ error: 'No data found' });
  }

  const keys = Object.keys(data[0]);
  const rows = [keys, ...data.map(row => keys.map(k => row[k] ?? ''))];

  res.status(200).json(rows);
}
