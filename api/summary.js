import data from '../data/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
  const headers = data[0];
  const colIndex = {
    machine: headers.indexOf('Máy'),
    quantity: headers.indexOf('Sản lượng'),
  };

  const summary = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const machine = row[colIndex.machine];
    const qty = parseInt(row[colIndex.quantity], 10) || 0;

    if (!summary[machine]) summary[machine] = 0;
    summary[machine] += qty;
  }

  const result = Object.entries(summary).map(([machine, total]) => ({
    machine,
    total,
  }));

  res.status(200).json(result);
}
