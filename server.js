import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import dataHandler from './api/data.js';
import summaryHandler from './api/summary.js';
import detailsHandler from './api/details.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(__dirname)); // phục vụ các file .js, .css

// API
app.get('/api/data', dataHandler);
app.get('/api/summary', summaryHandler);
app.get('/api/details', detailsHandler);

// Trả về index.html khi truy cập /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
