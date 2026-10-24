import { afterEach, describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../../mocks/tauri";
import { pickNativeFiles } from "../../../core/utils/nativeMultiPicker";

afterEach(() => vi.useRealTimers());

describe("native multi picker request ownership", () => {
  it("ignores stale events and settles only once when event and invoke both arrive", async () => {
    let complete!: (value: unknown) => void;
    let requestId = "";
    mockInvoke("plugin:vcp-mobile|pick_files", (args) => {
      requestId = String(args?.requestId);
      return new Promise((resolve) => { complete = resolve; });
    });
    const pending = pickNativeFiles("gallery");
    const result = { requestId, files: [], failures: [], cancelled: false };
    window.dispatchEvent(new CustomEvent("vcp-mobile-files-picked", {
      detail: { ...result, requestId: "older-request" },
    }));
    window.dispatchEvent(new CustomEvent("vcp-mobile-files-picked", { detail: result }));
    complete({ ...result, cancelled: true });
    expect(await pending).toEqual(result);
  });

  it("returns cancellation without treating it as a failed file", async () => {
    mockInvoke("plugin:vcp-mobile|pick_files", (args) => ({
      requestId: args?.requestId, files: [], failures: [], cancelled: true,
    }));
    expect((await pickNativeFiles("file")).cancelled).toBe(true);
  });

  it("cleans up listeners on timeout and ignores late completion", async () => {
    vi.useFakeTimers();
    const remove = vi.spyOn(window, "removeEventListener");
    mockInvoke("plugin:vcp-mobile|pick_files", () => new Promise(() => {}));
    const pending = expect(pickNativeFiles("file")).rejects.toThrow("超时");
    await vi.advanceTimersByTimeAsync(300_000);
    await pending;
    expect(remove).toHaveBeenCalledWith("vcp-mobile-files-picked", expect.any(Function));
  });
});
