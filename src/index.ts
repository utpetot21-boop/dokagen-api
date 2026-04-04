import 'dotenv/config';
import app from './app';
import { startScheduler } from './jobs/scheduler';

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`[DokaGen API] Server berjalan di port ${PORT}`);
  console.log(`[DokaGen API] Environment: ${process.env.NODE_ENV ?? 'development'}`);
  startScheduler();
});
