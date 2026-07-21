import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { healthRouter } from './routes/health';
import { chatRouter } from './routes/chat';
import { bookingConfirmRouter } from './routes/bookingConfirm';
import { logger } from './utils/logger';

const app = express();

app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/chat/confirm-booking', bookingConfirmRouter);
app.use('/api/chat', chatRouter);

app.listen(env.PORT, () => {
  logger.info(`Backend listening on http://localhost:${env.PORT}`);
});
