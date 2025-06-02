import path from 'path';
import fs from 'fs';

export function readPowerAppJSON() {
  const filePath = path.join(process.cwd(), 'data', 'powerapp.json');

  if (!fs.existsSync(filePath)) {
    console.error('⚠️ File powerapp.json not found');
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ Error reading powerapp.json:', err);
    return [];
  }
}
