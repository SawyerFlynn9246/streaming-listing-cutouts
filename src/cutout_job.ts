import { z } from "zod";
import type { BackgroundRemover, RemovedBackground } from "./background_removal_client.js";

export const listingRequestSchema = z.object({
  listingId: z.string().trim().min(1),
  creatorId: z.string().trim().min(1),
  image: z.string().url(),
  format: z.enum(["png", "webp"]).default("webp")
}).strict();

export type ListingRequest = z.infer<typeof listingRequestSchema>;

export type CutoutJob = {
  jobId: string;
  listingId: string;
  creatorId: string;
  state: "processing" | "ready";
  delivery: RemovedBackground | null;
};

export class CutoutWorkflow {
  private readonly jobs = new Map<string, CutoutJob>();
  private readonly remover: BackgroundRemover;

  constructor(remover: BackgroundRemover) {
    this.remover = remover;
  }

  async submit(input: ListingRequest): Promise<CutoutJob> {
    const existing = this.jobs.get(input.listingId);
    if (existing) return existing;

    const jobId = `cutout-${input.listingId}`;
    const job: CutoutJob = {
      jobId,
      listingId: input.listingId,
      creatorId: input.creatorId,
      state: "processing",
      delivery: null
    };
    this.jobs.set(input.listingId, job);

    try {
      const delivery = await this.remover.remove(input.image, input.format, jobId);
      const readyJob: CutoutJob = { ...job, state: "ready", delivery };
      this.jobs.set(input.listingId, readyJob);
      return readyJob;
    } catch (error) {
      this.jobs.delete(input.listingId);
      throw error;
    }
  }
}
