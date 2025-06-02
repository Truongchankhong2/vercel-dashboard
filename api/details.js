import data from '../data/powerapp.json' assert { type: 'json' };

export default function handler(req, res) {
  const headers = data[0];
  const colIndex = {
    machine: headers.indexOf('Máy'),
    rpro: headers.indexOf('RPRO'),
    brand: headers.indexOf('Brand Code'),
    productType: headers.indexOf('Product Type'),
    pu: headers.indexOf('PU'),
    quantity: headers.indexOf('Sản lượng'),
  };

  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    results.push({
      machine: row[colIndex.machine],
      order: row[colIndex.rpro],
      brandCode: row[colIndex.brand],
      productType: row[colIndex.productType],
      pu: row[colIndex.pu],
      quantity: parseInt(row[colIndex.quantity], 10) || 0,
    });
  }

  const { machine } = req.query;

  const filtered = results.filter(r => r.machine === machine);
  res.status(200).json(filtered);
}
