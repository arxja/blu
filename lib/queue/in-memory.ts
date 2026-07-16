import { QueueAdapter, QueueJob } from "@/types/types";
import { log } from "@/lib/logger";

export class InMemoryQueue implements QueueAdapter {
  private readonly maxRetries = 3;
  private readonly backoffBase = 200; // ms
  private deadLetterJobs: QueueJob[] = [];

  private async processWithRetry(
    job: QueueJob,
    handler: (job: QueueJob) => Promise<void>,
    attempt: number = 0,
  ): Promise<void> {
    try {
      log.info("Processing job", { jobId: job.id, attempt });
      await handler(job);
      log.info("Job completed", { jobId: job.id, attempt });
    } catch (error) {
      log.error("Job failed", error as Error, { jobId: job.id, attempt });
      const delay = this.backoffBase * 2 ** attempt;
      log.info("Retrying job", { jobId: job.id, attempt });
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.processWithRetry(job, handler, attempt + 1);
    }
    // Exhausted retries - send to dead-letter
    this.deadLetterJobs.push(job);
    log.info("Job moved to DLQ", {
      jobId: job.id,
      deadLetterSize: this.deadLetterJobs.length,
    });
  }

  enqueue(job: QueueJob, handler: (job: QueueJob) => Promise<void>): void {
    log.info("Enqueuing webhook job", {
      jobId: job.id,
      eventType: job.event.type,
    });

    setTimeout(() => {
      this.processWithRetry(job, handler);
    });
  }
}

export const queue = new InMemoryQueue();
