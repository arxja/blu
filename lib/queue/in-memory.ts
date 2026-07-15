import { QueueAdapter, QueueJob } from "@/types/types";
import { log } from "@/lib/logger";

export class InMemoryQueue implements QueueAdapter {
  enqueue(job: QueueJob, handler: (job: QueueJob) => Promise<void>): void {
    log.info("Enqueuing webhook job", {
      jobId: job.id,
      eventType: job.event.type,
    });

    // Defer execution so the 202 response can be sent immediately
    setImmediate(async () => {
      try {
        log.info("Processing job", { jobId: job.id });
        await handler(job);
        log.info("Job completed", { jobId: job.id });
      } catch (error) {
        log.error("Job failed", error as Error, { jobId: job.id });
      }
    });
  }
}

export const queue = new InMemoryQueue();
