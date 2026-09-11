import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RecentUpdates from "./RecentUpdates";

describe("RecentUpdates", () => {
  it("renders member joins and removals newest first", () => {
    const onLoadHistory = vi.fn();

    render(
      <RecentUpdates
        updates={[
          {
            id: "workspace:1",
            kind: "workspace",
            action: "member_removed",
            details: { memberId: 2, firstname: "Jordan", lastname: "Lee" },
            createdAt: "2026-09-01T10:00:00.000Z",
            actor: {
              id: 1,
              firstname: "Alex",
              lastname: "Ng",
              email: "alex@example.com",
            },
          },
          {
            id: "workspace:2",
            kind: "workspace",
            action: "member_joined",
            details: { memberId: 3 },
            createdAt: "2026-09-02T10:00:00.000Z",
            actor: {
              id: 3,
              firstname: "Taylor",
              lastname: "Smith",
              email: "taylor@example.com",
            },
          },
        ]}
        allUpdates={[]}
        historyCursor={null}
        isLoadingHistory={false}
        onLoadHistory={onLoadHistory}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Taylor Smith joined this workspace.");
    expect(items[1]).toHaveTextContent(
      "Alex Ng removed Jordan Lee from this workspace.",
    );

    fireEvent.click(screen.getByRole("button", { name: "View All" }));
    expect(screen.getByRole("dialog", { name: "Recent Updates" })).toBeVisible();
    expect(onLoadHistory).toHaveBeenCalledOnce();
  });
});
