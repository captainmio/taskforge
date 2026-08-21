import { describe, expect, it } from "vitest";
import { getWorkspaceDestination } from "./workspaceRouting";

describe("getWorkspaceDestination", () => {
  it("routes to the first joined workspace", () => {
    expect(
      getWorkspaceDestination([
        { id: 42, name: "Engineering" },
        { id: 84, name: "Product" },
      ]),
    ).toBe("/workspace/42");
  });

  it("routes to workspace creation when no workspaces are joined", () => {
    expect(getWorkspaceDestination([])).toBe("/create-workspace");
  });
});
