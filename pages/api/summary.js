export default async function handler(req, res) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'; // fallback khi chạy local

    const response = await fetch(`${baseUrl}/powerapp.json`);
    const data = await response.json();

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
  } catch (err) {
    console.error('❌ Failed to fetch JSON:', err);
    res.status(500).json({ error: 'Failed to load summary data' });
  }
}
