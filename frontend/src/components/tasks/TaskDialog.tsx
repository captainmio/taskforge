import { useState } from "react";
import { FaCalendarAlt, FaCircle, FaPlus } from "react-icons/fa";
import Button from "../ui/Button";
import Select from "../ui/Select";
import TaskAssigneeMultiSelect, {
  type TaskAssignee,
} from "./TaskAssigneeMultiSelect";
import TaskHistory from "./TaskHistory";
import TimeEstimateField from "./TimeEstimateField";
import {
  priorityPresentation,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./taskTypes";

interface TaskDialogProps {
  task: Task | null;
  initialStatus: TaskStatus;
  onClose: () => void;
}

const taskMembers: readonly TaskAssignee[] = [
  { id: "rustam", name: "Rustam Jordan", email: "rustam@example.com" },
  { id: "alex", name: "Alex Morgan", email: "alex@example.com" },
  { id: "jamie", name: "Jamie Lee", email: "jamie@example.com" },
  { id: "sam", name: "Sam Rivera", email: "sam@example.com" },
];

const TaskDialog = ({ task, initialStatus, onClose }: TaskDialogProps) => {
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium",
  );
  const [assignees, setAssignees] = useState<TaskAssignee[]>(() =>
    taskMembers.filter((member) => member.name === task?.assignee),
  );
  const [timeEstimate, setTimeEstimate] = useState("");
  const isEditing = task !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close task dialog"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between border-b border-gray-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 id="task-dialog-title" className="sr-only">
              Task details
            </h2>
            <div className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 focus-within:bg-slate-100 focus-within:ring-2 focus-within:ring-site-green">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-label="Task title"
                placeholder="Untitled task"
                className="w-full cursor-text border-0 bg-transparent p-0 text-xl font-bold text-gray-950 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-4 cursor-pointer text-xl text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4 p-6">
            <TaskAssigneeMultiSelect
              members={taskMembers}
              value={assignees}
              onChange={setAssignees}
            />
            <label className="block text-xs font-semibold text-gray-700">
              Description
              <textarea
                rows={6}
                defaultValue="Create wireframes and high-fidelity designs for this task."
                className="mt-1.5 w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-900"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-gray-700">
                Status
                <select
                  defaultValue={task?.status ?? initialStatus}
                  className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-700">
                Priority
                <Select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TaskPriority)
                  }
                  leadingIcon={
                    <FaCircle
                      className={priorityPresentation[priority].iconClassName}
                    />
                  }
                  className="mt-1.5"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </label>
              <label className="text-xs font-semibold text-gray-700">
                Due date
                <div className="relative mt-1.5">
                  <FaCalendarAlt className="pointer-events-none absolute left-3 top-3 text-gray-400" />
                  <input
                    defaultValue={task?.dueDate ?? "Jun 30, 2024"}
                    className="h-10 w-full rounded-lg border border-gray-200 py-2 pl-9 pr-2 text-sm"
                  />
                </div>
              </label>
            </div>
            <TimeEstimateField
              value={timeEstimate}
              onChange={setTimeEstimate}
            />
          </div>
          <TaskHistory />
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-slate-50 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button leadingIcon={<FaPlus />}>
            {isEditing ? "Save changes" : "Create task"}
          </Button>
        </footer>
      </section>
    </div>
  );
};

export default TaskDialog;
