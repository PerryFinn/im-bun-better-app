const DEFAULT_OCR_BASE_URL = "https://it-ocr.gz.cvte.cn";
const DEFAULT_REQUEST_TIMEOUT_MS = 360_000;
const TRAILING_SLASHES_PATTERN = /\/+$/;

export type OcrFileOptions = {
  cls?: boolean;
  det?: boolean;
  lang?: string;
  rec?: boolean;
  return_word_box?: boolean;
  seal_mode?: boolean;
};

export type ProcessOcrFileInput = OcrFileOptions & {
  file: File;
};

export type ProcessRemoteImageInput = {
  image_url: string;
  prompt_mode?: string;
};

export type OcrClient = {
  processFile: (input: ProcessOcrFileInput) => Promise<Response>;
  processRemoteImage: (input: ProcessRemoteImageInput) => Promise<Response>;
};

type CreateOcrClientOptions = {
  baseUrl?: string;
  fetch?: (
    input: Request | string | URL,
    init?: RequestInit
  ) => Promise<Response>;
  requestTimeoutMs?: number;
};

const jsonError = (detail: string, status: number) =>
  Response.json({ detail }, { status });

const appendOcrOptions = (form: FormData, input: OcrFileOptions) => {
  const entries = Object.entries(input).filter(
    ([key, value]) => key !== "file" && value !== undefined
  );

  for (const [key, value] of entries) {
    form.append(key, String(value));
  }
};

export const createOcrClient = ({
  baseUrl = DEFAULT_OCR_BASE_URL,
  fetch: fetchImplementation = globalThis.fetch,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: CreateOcrClientOptions = {}): OcrClient => {
  const normalizedBaseUrl = baseUrl.replace(TRAILING_SLASHES_PATTERN, "");

  const request = async (path: string, init: RequestInit) => {
    try {
      return await fetchImplementation(`${normalizedBaseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      return jsonError("OCR 上游服务暂时不可用或处理超时，请稍后重试", 502);
    }
  };

  return {
    processFile: (input) => {
      const form = new FormData();
      form.append("file", input.file, input.file.name);
      appendOcrOptions(form, input);

      return request("/process_image", {
        body: form,
        method: "POST",
      });
    },
    processRemoteImage: (input) =>
      request("/process_remote_image", {
        body: JSON.stringify(input),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
  };
};
