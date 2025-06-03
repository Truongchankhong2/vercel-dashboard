// api/summary.js
import { readPowerAppJSON } from '../utils.js'; 
// (nếu bạn vẫn dùng utils.js để fetch file JSON) 
// hoặc dùng fs.readFileSync như ví dụ trước để đọc trực tiếp

export default async function handler(req, res) {
  try {
    // --- 1. Đọc dữ liệu JSON vào mảng `data` ---
    const data = await readPowerAppJSON(); 
    // Nếu muốn chắc chắn, bạn có thể debug:
    // console.log('[DEBUG] powerapp length =', data.length);

    // --- 2. Khai báo tên trường (key) chính xác ---
    const machineKey = 'IN lean Line (MACHINE)'; 
    const qtyKey = 'Total Qty';

    // --- 3. Tổng hợp số lượng theo máy ---
    const machineMap = {};
    data.forEach((row) => {
      // Lấy tên máy (string), nếu undefined hoặc rỗng thì bỏ qua
      const machine = (row[machineKey] || '').toString().trim();
      // Lấy số lượng, loại bỏ dấu phẩy nếu có, và parse thành number
      const qty = Number(row[qtyKey]?.toString().replace(/,/g, '')) || 0;
      if (!machine) return; 

      if (!machineMap[machine]) {
        machineMap[machine] = 0;
      }
      machineMap[machine] += qty;
    });

    // --- 4. Chuyển thành mảng kết quả [{ machine, total }, …] ---
    const result = Object.entries(machineMap).map(([machine, total]) => ({
      machine,
      total,
    }));

    // --- 5. Tắt cache, buộc trả 200 + body JSON ---
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/summary:', err);
    res.status(500).json({ error: 'Đã có lỗi server' });
  }
}
