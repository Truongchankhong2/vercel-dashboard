import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { machine } = req.query;
  const jsonPath = path.join(process.cwd(), 'data', 'powerapp.json');

  if (!fs.existsSync(jsonPath)) {
    return res.status(500).json({ error: 'File powerapp.json not found' });
  }

  const jsonText = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(jsonText);
  const result = [];

  for (const row of data) {
    const rowMachine = row["LAMINATION MACHINE (PLAN)"]?.trim();
    if (rowMachine !== machine) continue;

    const qtyRaw = row["Total Qty"] ?? "0";

    result.push({
      machine: rowMachine,
      order: row["PRO ODER"],
      brandCode: row["Brand Code"] ?? "",
      productType: row["#MOLDED"] ?? "",
      pu: row["PU"] ?? "",
      quantity: parseInt(qtyRaw.toString().replace(/,/g, ""), 10) || 0,
    });
  }

  res.status(200).json(result);
}
