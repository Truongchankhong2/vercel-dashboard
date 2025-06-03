export async function readPowerAppJSON(req) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001';
    const res = await fetch(`${baseUrl}/powerapp.json`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch powerapp.json:', err);
    return [];
  }
}
