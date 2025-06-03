import { readPowerAppJSON } from '../utils.js';

export default async function handler(req, res) {
  const { machine } = req.query;
  const data = await readPowerAppJSON(req);
  const filtered = data
    .filter(r => (r['LAMINATION MACHINE (PLAN)'] || '').trim() === machine)
    .map(row => Object.values(row));
  if (filtered.length === 0) {
    return res.status(200).json([]);
  }
  const header = Object.keys(data[0]);
  res.status(200).json([header, ...filtered]);
}
