import data from '../data/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
  const { machine } = req.query;
  if (!machine) {
    return res.status(400).json({ error: 'Missing machine parameter' });
  }

  const result = data
    .filter(row => row["LAMINATION MACHINE (PLAN)"]?.trim() === machine)
    .map(row => ({
      order: row["ORDER CODE"],
      brandCode: row["BRAND CODE"],
      productType: row["PRODUCT TYPE"],
      pu: row["PU"],
      quantity: Number(row["Total Qty"]?.toString().replace(/,/g, '')) || 0,
    }));

  res.status(200).json(result);
}
