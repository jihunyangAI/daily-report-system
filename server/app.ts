import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

const app = express();

// ── CORS ──────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, cb) => {
      // curl / Postman 등 origin 없는 요청 허용
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS 정책에 위반됩니다'));
    },
    credentials: true,
  }),
);

// ── Body Parser ───────────────────────────
app.use(express.json());

// ── Request Logging (개발 환경) ───────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

// ── 404 / Error ───────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
