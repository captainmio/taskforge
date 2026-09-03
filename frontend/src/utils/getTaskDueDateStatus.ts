export type TaskDueDateStatus = "overdue" | "dueSoon" | "approaching" | "later";

const toLocalCalendarDate = (value: string): Date | null => {
  if (!value) return null;

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Categorises a due date against the current local calendar day.
 * Due within 48 hours is urgent, 3-7 days is approaching, and dates beyond
 * a week still have time.
 */
export const getTaskDueDateStatus = (
  dueDate: string,
  referenceDate = new Date(),
): TaskDueDateStatus => {
  const due = toLocalCalendarDate(dueDate);
  if (!due) return "later";

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const daysUntilDue = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 2) return "dueSoon";
  if (daysUntilDue <= 7) return "approaching";

  return "later";
};
