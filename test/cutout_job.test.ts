import assert from "node:assert/strict";
import test from "node:test";
import type { BackgroundRemover } from "../src/background_removal_client.js";
import { CutoutWorkflow } from "../src/cutout_job.js";

test("a repeated listing reuses its ready cutout", async () => {
  let calls = 0;
  const remover: BackgroundRemover = {
    async remove(image, format, idempotencyKey) {
      calls += 1;
      return { image, format, idempotencyKey, download: "https://cdn.example.com/cutout.webp" };
    }
  };
  const workflow = new CutoutWorkflow(remover);
  const input = {
    listingId: "episode-42-cover",
    creatorId: "creator-17",
    image: "https://images.example.com/episode-42.jpg",
    format: "webp" as const
  };

  const first = await workflow.submit(input);
  const repeated = await workflow.submit(input);

  assert.equal(calls, 1);
  assert.equal(repeated, first);
  assert.equal(repeated.state, "ready");
  assert.equal(repeated.jobId, "cutout-episode-42-cover");
});
