import { FetchTariffsJob } from './job/fetch-tariffs.job.js';
import { UpdateSheetsJob } from './job/update-sheets.job.js';
import env from './config/env/env.js';

const fetchTariffsJob = new FetchTariffsJob();
const updateSheetsJob = new UpdateSheetsJob();

let isTariffJobRunning = false;
let isSheetJobRunning = false;

async function runWithErrorHandling(
  job: { run: () => Promise<void> },
  jobName: string,
  lockFlag?: { value: boolean }
) {
  try {
    if (lockFlag?.value) {
      console.log(`Job ${jobName} already running, skipping...`);
      return;
    }

    if (lockFlag) lockFlag.value = true;
    console.log(`Starting job: ${jobName}`);
    await job.run();
    console.log(`Job ${jobName} completed successfully`);
  } catch (error) {
    console.error(`Error in job ${jobName}:`, error instanceof Error ? error.message : error);
  } finally {
    if (lockFlag) lockFlag.value = false;
  }
}

export async function startJobs() {
  try {
    // Только первоначальный запуск (синхронно)
    await runWithErrorHandling(fetchTariffsJob, 'initial tariffs update');
    await runWithErrorHandling(updateSheetsJob, 'initial sheets update');
    console.log('Initial data loaded successfully');
  } catch (error) {
    console.error('Failed to load initial data:', error);
    throw error;
  }
}

export const jobs = {
  fetchTariffsJob,
  updateSheetsJob
};