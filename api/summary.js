import { readPowerAppJSON } from '../utils.js';

export default async function handler(req, res) {
  const data = await readPowerAppJSON(req);
  const machineMap = {};
  data.forEach(row => {
    const machine = (row['LAMINATION MACHINE (PLAN)'] || '').trim();
    const qty = Number(row['Total Qty']?.toString().replace(/,/g, '')) || 0;
    if (!machine) return;
    machineMap[machine] = (machineMap[machine] || 0) + qty;
  });
  const result = Object.entries(machineMap).map(([machine, total]) => ({ machine, total }));
  res.status(200).json(result);
}
