import { readPowerAppJSON } from '../utils.js';

export default async function handler(req, res) {
  const data = await readPowerAppJSON(req);
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(200).json([]);
  }
  const header = Object.keys(data[0]);
  const rows = data.map(item => Object.values(item));
  res.status(200).json([header, ...rows]);
}
