import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import api from './routes/api.js';
import { db } from './database/db.js';
import { seedDatabase } from './database/seed.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, database: db.open }));
app.use('/api', api);
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
const port = Number(process.env.PORT) || 5000;
seedDatabase();
app.listen(port, () => console.log(`GatePass API listening at http://localhost:${port}`));
