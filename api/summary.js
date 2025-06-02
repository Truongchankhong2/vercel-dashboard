import data from '../data/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
  const summary = {};

  for (const row of data) {
    const machine = row["Máy"];
    const qty = parseInt(row["Sản lượng"], 10) || 0;

    if (!machine) continue;

    if (!summary[machine]) summary[machine] = 0;
    summary[machine] += qty;
  }

  const result = Object.entries(summary).map(([machine, total]) => ({
    machine,
    total,
  }));

  res.status(200).json(result);
}
