export default async function handler(req, res) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/powerapp.json`);
    const data = await response.json();

    const header = Object.keys(data[0] || {});
    const rows = [header];

    for (const row of data) {
      const values = header.map(h => row[h] ?? '');
      rows.push(values);
    }

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Failed to load powerapp.json in data.js:', err);
    res.status(500).json({ error: 'Failed to load data' });
  }
}
