/**
 * deleteQueue.ts
 *
 * BullMQ queue for scheduling Telegram message deletions.
 * Uses Redis as a persistent backend — survives bot restarts.
 *
 * Usage:
 *   scheduleMessageDeletion(chatId, messageId, delayMs)
 *
 * Worker runs in the same process as the bot.
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAME = 'delete-message';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// Shared Redis connection (maxRetriesPerRequest must be null for BullMQ)
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

interface DeleteJobData {
  chatId: number;
  messageId: number;
}

// Queue: add deletion jobs
const deleteQueue = new Queue<DeleteJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100, // keep last 100 failed jobs for debugging
  },
});

/**
 * Schedule a Telegram message to be deleted after `delayMs` milliseconds.
 * Survives bot restarts because the job is stored in Redis.
 */
export async function scheduleMessageDeletion(
  chatId: number,
  messageId: number,
  delayMs: number = 15 * 60 * 1000,
): Promise<void> {
  await deleteQueue.add(
    'delete',
    { chatId, messageId },
    { delay: delayMs },
  );
}

/**
 * Start the deletion worker.
 * Call this once at bot startup. Pass in the Telegram Bot API instance.
 */
export function startDeletionWorker(
  deleteMessage: (chatId: number, messageId: number) => Promise<void>,
): Worker<DeleteJobData> {
  const worker = new Worker<DeleteJobData>(
    QUEUE_NAME,
    async (job: Job<DeleteJobData>) => {
      const { chatId, messageId } = job.data;
      try {
        await deleteMessage(chatId, messageId);
      } catch {
        // Message may already be deleted by admin or user — ignore silently.
      }
    },
    { connection: redisConnection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[deleteQueue] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
