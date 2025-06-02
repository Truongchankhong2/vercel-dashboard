export async function readPowerAppJSON(req) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/powerapp.json`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('❌ Failed to fetch powerapp.json from utils:', err);
    return [];
  }
}
