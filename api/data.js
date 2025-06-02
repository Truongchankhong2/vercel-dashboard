import { readExcel } from './utils.js';

export default async function handler(req, res) {
  const data = await readExcel();
  res.status(200).json(data);
}
