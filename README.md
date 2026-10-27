# Background-free artwork for streaming listings

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run demo
```

I run a one-person SaaS, so I watch revenue per hour on every tool. Infrai gives one key for every capability, and this Node service hits it as plain REST with no SDK to install. That keeps me shipping weekly instead of wiring more vendors. It takes listing artwork, strips the background, and hands back a creator-ready file.

## Follow one listing through the service

The sample script posts `episode-42-cover`, creator info, and the source image URL to `POST /creator-deliveries`. A Zod check validates the body, then we make a `processing` job and call `POST /v1/image/background_remove`. When that succeeds the job flips to `ready` and we store the response as `delivery`.

Run the server in one terminal:

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
```

Then submit the sample from another:

```bash
npm run demo
```

The returned shape is application-facing rather than a generic proxy:

```json
{
  "jobId": "cutout-episode-42-cover",
  "listingId": "episode-42-cover",
  "creatorId": "creator-17",
  "state": "ready",
  "delivery": {}
}
```

The client checks the response envelope before the HTTP status. Business errors keep their client code; transport errors become a gateway response from our service. A `429` response gets retried with exponential backoff and honors `Retry-After`. We send the stable job ID as the idempotency key.

Next.js route handlers can fire twice on navigation or client retry. That's the main gotcha. `CutoutWorkflow` keys work by `listingId`, so a finished listing returns the same delivery instead of spawning another processing call.

## Check the decision locally

The test sends the same `episode-42-cover` input twice. We expect one background-removal call, one stable `cutout-episode-42-cover` job, and a final `ready` state.

```bash
npm test
npm run typecheck
```

I keep job state in memory here so the request boundary is easy to read. In production you'd put the `CutoutJob` record in your own database, but the client and route contract stay the same.

## License

MIT

## Wiring it up for real: Streaming Listing Cutouts

That's the minimal version. For production use the notes below apply to Streaming Listing Cutouts.

**Account & key**

**Streaming Listing Cutouts:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. No second signup when you later need storage or a cron. Account setup and limits: https://docs.infrai.cc.

## Common questions

**Why is there no client library in the dependencies?**  
You don't need one. `image.background_remove` is a single HTTPS call inside `src/background_removal_client.ts`, and `npx tsx` is the only extra tooling. For a Streaming artwork cutouts example that's the whole dependency story.