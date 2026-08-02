import { treaty } from "@elysiajs/eden";
import type { ApiApp } from "@im-debug-better-app/api";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type EdenError<TValue = unknown> = {
  status: unknown;
  value: TValue;
};

type EdenResponse<TData, TValue = unknown> = {
  data: TData;
  error: EdenError<TValue> | null;
};

const getErrorMessage = (status: unknown, value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "message" in value) {
    const { message } = value;

    if (typeof message === "string") {
      return message;
    }
  }

  const statusText =
    typeof status === "number" || typeof status === "string"
      ? String(status)
      : "unknown";

  return `请求失败（HTTP ${statusText}）`;
};

export const unwrapOrThrow = <TData, TValue = unknown>(
  result: EdenResponse<TData, TValue>
) => {
  if (result.error) {
    throw new Error(getErrorMessage(result.error.status, result.error.value));
  }

  return result.data;
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

const serverUrl = import.meta.env.VITE_SERVER_URL;

if (!serverUrl) {
  throw new Error("缺少环境变量 VITE_SERVER_URL");
}

export const apiClient = treaty<ApiApp>(serverUrl);
