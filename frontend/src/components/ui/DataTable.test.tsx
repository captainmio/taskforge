import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import DataTable, {
  type DataTableColumn,
  type DataTableSort,
} from "./DataTable";

interface Row {
  id: number;
  name: string;
  joinedAt: string;
}

const rows: Row[] = [
  { id: 1, name: "Ada", joinedAt: "2024-01-01" },
  { id: 2, name: "Grace", joinedAt: "2024-02-01" },
];

const columns: DataTableColumn<Row>[] = [
  {
    id: "name",
    header: "Member",
    sortable: true,
    cell: (row) => row.name,
  },
  {
    id: "joinedAt",
    header: "Joined at",
    sortable: true,
    cell: (row) => row.joinedAt,
  },
  {
    id: "actions",
    header: "Actions",
    hideHeader: true,
    cell: () => <button type="button">Edit</button>,
  },
];

const SortableTable = ({ onSort }: { onSort?: (sort: DataTableSort) => void }) => {
  const [sort, setSort] = useState<DataTableSort | null>(null);

  return (
    <DataTable
      ariaLabel="Test members"
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyState={<p>No rows</p>}
      sort={sort}
      onSortChange={(nextSort) => {
        setSort(nextSort);
        onSort?.(nextSort);
      }}
    />
  );
};

describe("DataTable", () => {
  it("renders accessible headers, rows, and visually hidden headings", () => {
    render(<SortableTable />);

    const table = screen.getByRole("table", { name: "Test members" });
    expect(within(table).getByRole("columnheader", { name: "Member" })).toHaveAttribute(
      "aria-sort",
      "none",
    );
    expect(within(table).getByRole("columnheader", { name: "Joined at" })).toBeVisible();
    expect(
      within(table).getByRole("columnheader", { name: "Actions" }).firstElementChild,
    ).toHaveClass("sr-only");
    expect(within(table).getByText("Ada")).toBeVisible();
    expect(within(table).getByText("Grace")).toBeVisible();
  });

  it("shows the supplied empty state when there are no rows", () => {
    render(
      <DataTable
        ariaLabel="Empty members"
        rows={[] as Row[]}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyState={<p>No matching members</p>}
      />,
    );

    expect(screen.getByText("No matching members")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("toggles one active sorted column and resets the previous column", () => {
    const onSort = vi.fn();
    render(<SortableTable onSort={onSort} />);
    const table = screen.getByRole("table", { name: "Test members" });
    const memberHeader = within(table).getByRole("columnheader", {
      name: "Member",
    });
    const joinedHeader = within(table).getByRole("columnheader", {
      name: "Joined at",
    });

    fireEvent.click(within(memberHeader).getByRole("button"));
    expect(memberHeader).toHaveAttribute("aria-sort", "ascending");
    expect(onSort).toHaveBeenLastCalledWith({
      columnId: "name",
      direction: "ascending",
    });

    fireEvent.click(within(memberHeader).getByRole("button"));
    expect(memberHeader).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(within(joinedHeader).getByRole("button"));
    expect(joinedHeader).toHaveAttribute("aria-sort", "ascending");
    expect(memberHeader).toHaveAttribute("aria-sort", "none");
    expect(onSort).toHaveBeenLastCalledWith({
      columnId: "joinedAt",
      direction: "ascending",
    });
  });

  it("provides the same named sort controls for mobile layouts", () => {
    render(<SortableTable />);

    const mobileSortControls = screen.getByRole("group", {
      name: "Sort Test members",
    });
    expect(
      within(mobileSortControls).getByRole("button", { name: "Member" }),
    ).toHaveClass("cursor-pointer");
    expect(
      within(mobileSortControls).getByRole("button", { name: "Joined at" }),
    ).toBeVisible();
  });
});
