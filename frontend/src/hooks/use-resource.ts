"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api/request";
import { ApiError } from "@/lib/api/types";

type ResourceState<T> =
  | { phase: "loading" }
  | { phase: "waking" }
  | { phase: "ready"; data: T }
  | { phase: "error"; error: ApiError };

export function useResource<T>(path: string, enabled = true) {
  const [state, setState] = useState<ResourceState<T>>({ phase: "loading" });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void apiRequest<T>(path, {
      signal: controller.signal,
      onWarming: () => {
        if (!controller.signal.aborted) setState({ phase: "waking" });
      },
    })
      .then((data) => {
        if (!controller.signal.aborted) setState({ phase: "ready", data });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          phase: "error",
          error:
            reason instanceof ApiError
              ? reason
              : new ApiError("The request failed.", "unexpected"),
        });
      });
    return () => controller.abort();
  }, [enabled, path, revision]);

  return { ...state, retry };
}
