export default async function handler(req, res) {
  const machine = req.query.machine;
  if (!machine) return res.status(400).json({ error: 'Missing machine param' });

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/powerapp.json`);
    const data = await response.json();

    const filtered = data.filter(row =>
      (row["LAMINATION MACHINE (PLAN)"] || '').trim() === machine
    ).map(row => ({
      order: row["ORDER"],
      brandCode: row["BRAND CODE"],
      productType: row["PRODUCT TYPE"],
      pu: row["PU"],
      quantity: Number(row["Total Qty"]?.toString().replace(/,/g, '')) || 0
    }));

    res.status(200).json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load details' });
  }
}
