import { invoke } from "@tauri-apps/api/core";
import type { PickedFilesResult } from "tauri-plugin-vcp-mobile";

/** Native events and invoke can race; only the matching request may settle once. */
export function pickNativeFiles(mode: "gallery" | "file"): Promise<PickedFilesResult> {
  const requestId = `pick_${crypto.randomUUID()}`;
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      window.removeEventListener("vcp-mobile-files-picked", onPicked);
      clearTimeout(timer);
    };
    const finish = (result: PickedFilesResult) => {
      if (settled || result.requestId !== requestId) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onPicked = (event: Event) => finish((event as CustomEvent<PickedFilesResult>).detail);
    const timer = setTimeout(() => fail(new Error("文件选择超时，请重试")), 300_000);
    window.addEventListener("vcp-mobile-files-picked", onPicked);
    invoke<PickedFilesResult>("plugin:vcp-mobile|pick_files", { mode, requestId }).then(finish, fail);
  });
}
