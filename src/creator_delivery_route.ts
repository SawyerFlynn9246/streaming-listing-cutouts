import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiBackgroundRemover, InfraiError } from "./background_removal_client.js";
import { CutoutWorkflow, listingRequestSchema } from "./cutout_job.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const workflow = new CutoutWorkflow(new InfraiBackgroundRemover(apiKey));

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/creator-deliveries") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = listingRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const job = await workflow.submit(input);
    send(response, 201, job);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid listing request" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.code, message: error.message });
      return;
    }
    send(response, 502, { error: "Image processing did not complete" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Creator delivery service listening on http://localhost:${port}`);
});
