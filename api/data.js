import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'data', 'powerapp.json');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const jsonData = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(jsonData);
  res.status(200).json(json);
}
