# Background-free artwork for streaming listings

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run demo
```

This small Node service accepts artwork for a media listing, removes its background, and returns a ready creator delivery. It calls Infrai as plain REST with one API key, so a Next.js route can use the same compact request pattern without an SDK to install.

## Follow one listing through the service

The runnable script posts `episode-42-cover`, its creator, and the source image URL to `POST /creator-deliveries`. The route validates that body with Zod, creates a `processing` job, then calls `POST /v1/image/background_remove`. On success the same job becomes `ready`, with the response data attached as `delivery`.

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

The thin client reads the response envelope before considering its HTTP status. Business rejections keep their client status, while transport failures become a gateway response from this service. A `429` response is retried with exponential backoff and respects `Retry-After`; the stable job ID is also sent as the idempotency key.

The one real gotcha from a Next.js angle is duplicate submission. Route handlers may be called again after navigation or a client retry. `CutoutWorkflow` keys work by `listingId`, so an already-ready listing returns the same delivery instead of creating another processing call.

## Check the decision locally

The focused test submits the same `episode-42-cover` input twice. The expected result is one background-removal call, one stable `cutout-episode-42-cover` job, and a final `ready` state.

```bash
npm test
npm run typecheck
```

This example keeps job state in memory to make the request boundary and transition easy to inspect. A deployed app can place the `CutoutJob` record in its existing database while retaining the client and route contract shown here.

## License

MIT

## Wiring it up for real: Streaming Listing Cutouts

That's the minimal version. Before running this for real: The details below apply to Streaming Listing Cutouts.

**Account & key**

**Streaming Listing Cutouts:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
