import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mockInvoke, invokeMock } from "../../mocks/tauri";
import { useAttachmentStore } from "../../../core/stores/attachmentStore";

vi.mock("../../../core/utils/platform", () => ({ isAndroid: true }));
const notify = vi.hoisted(() => vi.fn());
vi.mock("../../../core/stores/notification", () => ({
  useNotificationStore: () => ({ addNotification: notify }),
}));
const file = (name: string) => ({ path: `/cache/${name}`, name, size: 20, mime: "text/plain", hash: name });

beforeEach(() => { setActivePinia(createPinia()); notify.mockClear(); });

describe("attachment batch registration", () => {
  it("preserves order and siblings across native and registration failures", async () => {
    mockInvoke("plugin:vcp-mobile|pick_files", (args) => ({
      requestId: args?.requestId, files: [file("a.txt"), file("bad.txt"), file("c.txt")],
      failures: [{ index: 3, error: "provider unavailable" }], cancelled: false,
    }));
    mockInvoke("register_local_file", (args) => {
      if (args?.originalName === "bad.txt") return Promise.reject(new Error("registration failed"));
      return { ...file(String(args?.originalName)), type: "text/plain", internalPath: "/cas/file" };
    });
    const store = useAttachmentStore();
    await store.handleAttachment("file");
    expect(store.stagedAttachments.map((item) => item.name)).toEqual(["a.txt", "c.txt"]);
    expect(store.stagedAttachments.every((item) => item.status === "done")).toBe(true);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("2 个") }));
  });

  it("does not resurrect a card removed during registration and rejects duplicate picker opens", async () => {
    let finish!: (data: unknown) => void;
    mockInvoke("plugin:vcp-mobile|pick_files", (args) => ({
      requestId: args?.requestId, files: [file("a.txt")], failures: [], cancelled: false,
    }));
    mockInvoke("register_local_file", () => new Promise((resolve) => { finish = resolve; }));
    const store = useAttachmentStore();
    const pending = store.handleAttachment("gallery");
    await vi.waitFor(() => expect(store.stagedAttachments).toHaveLength(1));
    await store.handleAttachment("file");
    expect(invokeMock.mock.calls.filter(([name]) => name === "plugin:vcp-mobile|pick_files")).toHaveLength(1);
    store.stagedAttachments.splice(0, 1);
    finish({ ...file("a.txt"), type: "text/plain", internalPath: "/cas/a" });
    await pending;
    expect(store.stagedAttachments).toEqual([]);
  });
});
