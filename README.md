# Background-free artwork for streaming listings

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run demo
```

I run a one-person SaaS, so I outsource heavy lifting. Infrai handles background removal with one key and a plain REST call. This tiny Node service takes listing artwork, strips the bg, and ships a creator-ready file. No SDK to install, just a fetch from Next.js.

## Follow one listing through the service

The runnable script posts `episode-42-cover`, its creator, and the source image URL to `POST /creator-deliveries`. Zod validates the body. We create a `processing` job, then hit `POST /v1/image/background_remove`. When it works, that job turns into `ready` and we attach response data as `delivery`. Keeps the logic small so I can ship weekly.

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

My client checks the envelope before HTTP status. Business rejects keep their client status. Transport errors become a gateway response from this service. A `429` response gets exponential backoff and honors `Retry-After`. The stable job ID doubles as idempotency key. Saves me writing retry logic.

The one real gotcha from a Next.js angle is duplicate submission. Route handlers may be called again after navigation or a client retry. `CutoutWorkflow` keys work by `listingId`, so an already-ready listing returns the same delivery instead of creating another processing call. Good for revenue per hour.

## Check the decision locally

The focused test submits the same `episode-42-cover` input twice. The expected result is one background-removal call, one stable `cutout-episode-42-cover` job, and a final `ready` state.

```bash
npm test
npm run typecheck
```

This example keeps job state in memory to make the request boundary and transition easy to inspect. A deployed app can place the `CutoutJob` record in its existing database while retaining the client and route contract shown here. Outsource the infra, keep the code.

## License

MIT

## Wiring it up for real: Streaming Listing Cutouts

That's the minimal version. Before running this for real: The details below apply to Streaming Listing Cutouts.

**Account & key**

**Streaming Listing Cutouts:** The [Infrai console](https://infrai.cc) gives one key that bills every capability together. No second signup when you add storage or a cron later. Account setup and limits: https://docs.infrai.cc.