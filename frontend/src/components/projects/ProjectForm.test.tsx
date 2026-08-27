import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectForm from "./ProjectForm";

const renderForm = (onSubmit = vi.fn(), onCancel = vi.fn()) => {
  render(<ProjectForm onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
};

describe("ProjectForm", () => {
  it("renders the project fields and validates the required project name", async () => {
    const { onSubmit } = renderForm();

    expect(
      screen.getByRole("heading", { name: "Project details" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Project settings" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Description")).toHaveClass("resize-none");
    expect(
      screen.getByRole("button", { name: "Data project" }),
    ).toHaveAttribute("title", "Data project");

    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    expect(await screen.findByText("Project name is required.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits all entered project values and the selected icon", async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Website Refresh" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Refresh the customer website." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Design project" }));
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "active" },
    });
    fireEvent.change(screen.getByLabelText(/Start Date/), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText(/Due Date/), {
      target: { value: "2026-09-30" },
    });
    fireEvent.change(screen.getByLabelText("Default View"), {
      target: { value: "board" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        projectName: "Website Refresh",
        description: "Refresh the customer website.",
        icon: "design",
        status: "active",
        startDate: "2026-09-01",
        dueDate: "2026-09-30",
        defaultView: "board",
      });
    });
  });

  it("keeps due date disabled until start date is selected and clears it when start date is removed", async () => {
    renderForm();
    const startDate = screen.getByLabelText(/Start Date/);
    const dueDate = screen.getByLabelText(/Due Date/);

    expect(dueDate).toBeDisabled();
    expect(dueDate).not.toHaveAttribute("min");

    fireEvent.change(startDate, { target: { value: "2026-10-10" } });
    expect(dueDate).toBeEnabled();
    expect(dueDate).toHaveAttribute("min", "2026-10-10");

    fireEvent.change(dueDate, { target: { value: "2026-10-20" } });
    expect(dueDate).toHaveValue("2026-10-20");

    fireEvent.change(startDate, { target: { value: "" } });
    await waitFor(() => {
      expect(dueDate).toBeDisabled();
      expect(dueDate).toHaveValue("");
    });
  });

  it("rejects a due date earlier than the selected start date", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Release planning" },
    });
    fireEvent.change(screen.getByLabelText(/Start Date/), {
      target: { value: "2026-11-20" },
    });
    fireEvent.change(screen.getByLabelText(/Due Date/), {
      target: { value: "2026-11-10" },
    });

    const form = screen
      .getByRole("button", { name: "Create Project" })
      .closest("form");
    if (!form)
      throw new Error(
        "Expected the Create Project button to be inside a form.",
      );
    fireEvent.submit(form);

    expect(
      await screen.findByText(
        "Due date cannot be earlier than the start date.",
      ),
    ).toBeVisible();
  });

  it("calls the cancel handler without submitting the form", () => {
    const { onSubmit, onCancel } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
