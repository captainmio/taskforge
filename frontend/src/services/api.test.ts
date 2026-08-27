import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  responseUse: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("axios", () => ({
  AxiosError: class AxiosError extends Error {},
  default: {
    create: mocks.create,
  },
}));

vi.mock("react-toastify", () => ({
  toast: { error: mocks.showError },
}));

mocks.create.mockReturnValue({
  interceptors: { response: { use: mocks.responseUse } },
});

await import("./api");

const rejectResponse = mocks.responseUse.mock.calls[0]?.[1] as (
  error: unknown,
) => Promise<never>;

describe("API response errors", () => {
  it.each([
    "/workspaces/invitations/accept",
    "/workspaces/invitation-links/accept",
  ])(
    "does not show a global toast for expected acceptance errors from %s",
    async (url) => {
      const error = {
        config: { url },
        response: { data: { error: "Authentication required" }, status: 401 },
      };

      await expect(rejectResponse(error)).rejects.toBe(error);
      expect(mocks.showError).not.toHaveBeenCalled();
    },
  );

  it("shows the backend error for other failed API requests", async () => {
    const error = {
      config: { url: "/workspaces/42/invitation-link" },
      response: { data: { error: "Not allowed" }, status: 403 },
    };

    await expect(rejectResponse(error)).rejects.toBe(error);
    expect(mocks.showError).toHaveBeenCalledWith("Not allowed");
  });

  it("shows a connection error when no response is available", async () => {
    const error = { config: { url: "/workspaces/42/invitation-link" } };

    await expect(rejectResponse(error)).rejects.toBe(error);
    expect(mocks.showError).toHaveBeenCalledWith(
      "Unable to connect to the server.",
    );
  });
});
