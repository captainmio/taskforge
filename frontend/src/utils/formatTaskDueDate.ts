export const formatTaskDueDate = (dueDate: string): string => {
  if (!dueDate) return "No due date";

  const date = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dueDate
    : new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
};
