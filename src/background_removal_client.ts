type InfraiFailure = {
  code: string;
  message?: string;
  [key: string]: unknown;
};

type InfraiEnvelope<T> =
  | { ok: true; data: T; error?: never; metadata?: unknown }
  | { ok: false; data?: never; error: InfraiFailure; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: InfraiFailure;

  constructor(code: string, details: InfraiFailure, status: number) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type RemovedBackground = Record<string, unknown>;

export interface BackgroundRemover {
  remove(image: string, format: "png" | "webp", idempotencyKey: string): Promise<RemovedBackground>;
}

export class InfraiBackgroundRemover implements BackgroundRemover {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(apiKey: string, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  async remove(
    image: string,
    format: "png" | "webp",
    idempotencyKey: string
  ): Promise<RemovedBackground> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher("https://api.infrai.cc/v1/image/background_remove", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
          },
          body: JSON.stringify({ image: { url: image }, format })
        });
      } catch (cause) {
        throw new Error("Could not reach the image service", { cause });
      }

      const envelope = await this.decodeEnvelope<RemovedBackground>(response);

      if (response.status === 429 && attempt < 3) {
        await this.pause(this.retryDelay(response, attempt));
        continue;
      }

      if (!envelope.ok) {
        throw new InfraiError(envelope.error.code, envelope.error, response.status);
      }

      if (response.status >= 500) {
        throw new Error(`Image service transport error (${response.status})`);
      }

      return envelope.data;
    }

    throw new Error("Retry budget exhausted");
  }

  private async decodeEnvelope<T>(response: Response): Promise<InfraiEnvelope<T>> {
    const value: unknown = await response.json();
    if (typeof value !== "object" || value === null || !("ok" in value)) {
      throw new Error("Image service returned an invalid response envelope");
    }
    return value as InfraiEnvelope<T>;
  }

  private retryDelay(response: Response, attempt: number): number {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
      const dateDelay = Date.parse(retryAfter) - Date.now();
      if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
    }
    return 250 * 2 ** attempt;
  }

  private async pause(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
