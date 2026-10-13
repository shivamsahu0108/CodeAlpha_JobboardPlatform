import toast from "react-hot-toast";
import { errorText } from "../api";

export const notifyError = (error: unknown) => toast.error(errorText(error));

export function responseFieldErrors(error: unknown): Record<string, string> {
  const payload = (error as { response?: { data?: unknown } })?.response?.data;
  if (!payload || typeof payload !== "object") return {};
  return Object.fromEntries(
    Object.entries(payload).flatMap(([key, value]) => {
      const message = Array.isArray(value)
        ? value.find((item) => typeof item === "string")
        : value;
      return typeof message === "string" ? [[key, message]] : [];
    }),
  );
}
