import data from '../data/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
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
