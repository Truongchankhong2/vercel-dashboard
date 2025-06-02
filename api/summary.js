import data from '../public/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
  // Tổng hợp (sum) quantity theo mỗi “LAMINATION MACHINE (PLAN)”
  const machineMap = {};

  data.forEach(row => {
    const machine = row["LAMINATION MACHINE (PLAN)"]?.trim();
    const qty = Number(row["Total Qty"]?.toString().replace(/,/g, '')) || 0;
    if (!machine) return;
    machineMap[machine] = (machineMap[machine] || 0) + qty;
  });

  // Chuyển thành mảng [{ machine, total }]
  const result = Object.entries(machineMap).map(([machine, total]) => ({ machine, total }));
  res.status(200).json(result);
}
