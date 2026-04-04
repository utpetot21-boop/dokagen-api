import { initCronJobs } from '../modules/notifikasi/cron.service';

export function startScheduler() {
  initCronJobs();
  console.log('[scheduler] Started');
}
