import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const jsonPath = path.join(process.cwd(), 'data', 'powerapp.json');

  if (!fs.existsSync(jsonPath)) {
    return res.status(500).json({ error: 'File powerapp.json not found' });
  }

  const jsonText = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(jsonText);

  const machineMap = {};

  for (const row of data) {
    const machine = row["LAMINATION MACHINE (PLAN)"]?.trim();
    const qty = Number(row["Total Qty"]?.toString().replace(/,/g, '')) || 0;

    if (machine) {
      machineMap[machine] = (machineMap[machine] || 0) + qty;
    }
  }

  const result = Object.entries(machineMap).map(([machine, total]) => ({
    machine,
    total,
  }));

  res.status(200).json(result);
}
