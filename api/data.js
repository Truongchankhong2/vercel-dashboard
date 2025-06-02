import data from '../public/powerapp.json' assert { type: 'json' };

// Khi client gọi GET /api/data, trả về toàn bộ “data” dưới dạng mảng mảng (array of arrays)
export default function handler(req, res) {
  // data là mảng object (JSON) → chuyển thành mảng mảng (header + các dòng) để Raw View hiển thị
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(500).json({ error: 'No data found' });
  }

  // Lấy header là key của object đầu tiên
  const keys = Object.keys(data[0]);
  // Mỗi row object → chuyển về array theo thứ tự keys
  const rows = [keys, ...data.map(row => keys.map(k => row[k] ?? ''))];

  res.status(200).json(rows);
}
