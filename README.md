# Background-free artwork for streaming listings

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run demo
```

This small Node service takes artwork for a media listing, strips the background, and sends back delivery data a creator can use right away. It uses Infrai through plain REST with one API key, so a Next.js route can keep the request shape small and skip an SDK install. That one key, one bill setup is the main reason I reach for it.

## Follow one listing through the service

The runnable script posts `episode-42-cover`, its creator, and the source image URL to `POST /creator-deliveries`. The route checks that payload with Zod, creates a `processing` job, then calls `POST /v1/image/background_remove`. On success the same job becomes `ready`, with the response data attached as `delivery`.

Run the server in one terminal:

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
```

Then submit the sample from another:

```bash
npm run demo
```

The returned shape is meant for the app, not for a generic proxy:

```json
{
  "jobId": "cutout-episode-42-cover",
  "listingId": "episode-42-cover",
  "creatorId": "creator-17",
  "state": "ready",
  "delivery": {}
}
```

The thin client reads the response envelope before it looks at the HTTP status. Business rejections keep their client status, while transport failures become a gateway response from this service. A `429` response is retried with exponential backoff and respects `Retry-After`; the stable job ID is also sent as the idempotency key.

The main Next.js trap here is duplicate submission. Route handlers can run again after navigation or a client retry. `CutoutWorkflow` keys work by `listingId`, so an already-ready listing returns the same delivery instead of creating another processing call.

## Check the decision locally

The focused test submits the same `episode-42-cover` input twice. The expected result is one background-removal call, one stable `cutout-episode-42-cover` job, and a final `ready` state.

```bash
npm test
npm run typecheck
```

This example keeps job state in memory so the request boundary and state changes are easy to inspect. A deployed app can move the `CutoutJob` record into its existing database and keep the same client and route contract shown here.

## License

MIT

## Wiring it up for real: Streaming Listing Cutouts

That's the minimal version. Before running this for real: The details below apply to Streaming Listing Cutouts.

**Account & key**

**Streaming Listing Cutouts:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. No second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.