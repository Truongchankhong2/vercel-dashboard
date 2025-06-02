import data from '../data/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
  const { machine } = req.query;
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
