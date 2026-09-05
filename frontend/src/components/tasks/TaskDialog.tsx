import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import { FaCalendarAlt, FaCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import Button from "../ui/Button";
import Select from "../ui/Select";
import TaskAssigneeMultiSelect, {
  type TaskAssignee,
} from "./TaskAssigneeMultiSelect";
import TaskHistory from "./TaskHistory";
import TaskComments from "./TaskComments";
import TimeEstimateField from "./TimeEstimateField";
import {
  createTask,
  updateTask,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from "../../services/tasks";
import { getWorkspaceMembers } from "../../services/workspaces";
import {
  priorityPresentation,
  taskColumns,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./taskTypes";

interface TaskDialogProps {
  task: Task | null;
  initialStatus: TaskStatus;
  workspaceId: string;
  projectId: number;
  canCompleteInReview?: boolean;
  isStatusLocked?: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  onTaskUpdated: (taskId: number, updates: Partial<Task>) => void;
}

const TaskDialog = ({
  task,
  initialStatus,
  workspaceId,
  projectId,
  canCompleteInReview = false,
  isStatusLocked = false,
  onClose,
  onTaskCreated,
  onTaskUpdated,
}: TaskDialogProps) => {
  const [title, setTitle] = useState<string>(task?.title ?? "");
  const [description, setDescription] = useState<string>(
    task?.description ?? "",
  );
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? initialStatus,
  );
  const statusColumn = taskColumns.find((column) => column.status === status);
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium",
  );
  const [members, setMembers] = useState<TaskAssignee[]>([]);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(true);
  const [timeEstimate, setTimeEstimate] = useState<string>(
    task?.timeEstimate ?? "",
  );
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate?.slice(0, 10) ?? "",
  );
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [historyRefreshVersion, setHistoryRefreshVersion] = useState(0);
  const creationStarted = useRef(false);
  const taskId = task?.id ?? createdTaskId;

  useEffect(() => {
    let isActive = true;

    if (!workspaceId)
      return () => {
        isActive = false;
      };

    const loadMembers = async () => {
      try {
        const response = await getWorkspaceMembers(workspaceId, {
          page: 1,
          pageSize: 100,
        });
        if (!isActive) return;
        const workspaceMembers = response.data.members.map((member) => ({
          id: String(member.id),
          name: `${member.firstname} ${member.lastname}`,
          email: member.email,
        }));
        setMembers(workspaceMembers);
        setAssignees((currentAssignees) =>
          currentAssignees.length > 0
            ? currentAssignees
            : workspaceMembers.filter(
                (member) =>
                  task?.assignees?.some(
                    (assignee) => String(assignee.id) === member.id,
                  ) ?? false,
              ),
        );
      } catch {
        if (isActive) setMembers([]);
      } finally {
        if (isActive) setIsLoadingMembers(false);
      }
    };

    void loadMembers();

    return () => {
      isActive = false;
    };
  }, [task?.assignees, workspaceId]);

  const getTaskPayload = useCallback(
    (): CreateTaskPayload => ({
      title: title.trim(),
      description,
      status,
      priority,
      assigneeIds: assignees.map((assignee) => assignee.id),
      dueDate: dueDate || null,
      timeEstimate: timeEstimate || null,
    }),
    [assignees, description, dueDate, priority, status, timeEstimate, title],
  );

  const persistChanges = async (
    payload: UpdateTaskPayload,
    boardUpdates: Partial<Task> = {},
  ) => {
    if (!taskId || !workspaceId || !Number.isSafeInteger(projectId)) return;
    try {
      await updateTask(workspaceId, projectId, taskId, payload);
      onTaskUpdated(taskId, boardUpdates);
      setHistoryRefreshVersion((currentVersion) => currentVersion + 1);
    } catch {
      // The shared API client displays errors while preserving the user's input.
    }
  };

  const createDraftTask = useCallback(async () => {
    if (
      taskId ||
      creationStarted.current ||
      !title.trim() ||
      !workspaceId ||
      !Number.isSafeInteger(projectId)
    )
      return;

    // A draft stays only in the browser until its title is meaningful. This avoids
    // blank records while removing the need for a separate Create button.
    creationStarted.current = true;
    setIsCreating(true);
    try {
      const payload = getTaskPayload();
      const response = await createTask(workspaceId, projectId, payload);
      const createdTask: Task = {
        id: response.data.id,
        title: payload.title,
        description: payload.description,
        assignee: assignees.map((assignee) => assignee.name).join(", "),
        assignees: assignees.map((assignee) => ({
          id: assignee.id,
          name: assignee.name,
        })),
        dueDate,
        timeEstimate,
        priority,
        status,
      };
      setCreatedTaskId(createdTask.id);
      onTaskCreated(createdTask);
      toast.success("Task created");
    } catch {
      // Allow the user to edit the draft and retry on the next title trigger.
      creationStarted.current = false;
    } finally {
      setIsCreating(false);
    }
  }, [
    assignees,
    dueDate,
    getTaskPayload,
    priority,
    projectId,
    status,
    taskId,
    timeEstimate,
    title,
    workspaceId,
    onTaskCreated,
  ]);

  useEffect(() => {
    if (taskId || !title.trim()) return;
    // An idle title creates the draft; title blur calls the same guarded function.
    const debouncedCreateDraftTask = debounce(
      () => void createDraftTask(),
      600,
    );
    debouncedCreateDraftTask();
    return () => debouncedCreateDraftTask.cancel();
  }, [createDraftTask, taskId, title]);

  const persistAssignees = (nextAssignees: TaskAssignee[]) => {
    setAssignees(nextAssignees);
    void persistChanges(
      { assigneeIds: nextAssignees.map((assignee) => assignee.id) },
      {
        assignee: nextAssignees.map((assignee) => assignee.name).join(", "),
        assignees: nextAssignees.map((assignee) => ({
          id: assignee.id,
          name: assignee.name,
        })),
      },
    );
  };

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
        aria-busy={isCreating}
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
                onBlur={() =>
                  taskId
                    ? void persistChanges({ title }, { title })
                    : void createDraftTask()
                }
                aria-label="Task title"
                placeholder="Untitled task"
                disabled={isCreating}
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
          <div className="min-w-0">
            <fieldset disabled={isCreating} className="space-y-4 border-0 p-6">
              <TaskAssigneeMultiSelect
                members={members}
                value={assignees}
                onChange={persistAssignees}
                disabled={isLoadingMembers}
              />
              <label className="block text-xs font-semibold text-gray-700">
                Description
                <textarea
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={() =>
                    void persistChanges({ description }, { description })
                  }
                  className="mt-1.5 w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-900"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-gray-700">
                  Status
                  {isStatusLocked ? (
                    <p
                      className={`mt-1.5 rounded-md border px-3 py-2 text-sm font-medium text-gray-800 ${statusColumn?.surfaceClassName ?? ""}`}
                    >
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${statusColumn?.dotClassName ?? ""}`}
                      />
                      {statusColumn?.label ?? status.replace("_", " ")}
                    </p>
                  ) : (
                    <select
                      value={status}
                      onChange={(event) => {
                        const nextStatus = event.target.value as TaskStatus;
                        setStatus(nextStatus);
                        void persistChanges(
                          { status: nextStatus },
                          { status: nextStatus },
                        );
                      }}
                      className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done" disabled={!canCompleteInReview}>
                        Done
                      </option>
                    </select>
                  )}
                </label>
                <label className="text-xs font-semibold text-gray-700">
                  Priority
                  <Select
                    value={priority}
                    onChange={(event) => {
                      const nextPriority = event.target.value as TaskPriority;
                      setPriority(nextPriority);
                      void persistChanges(
                        { priority: nextPriority },
                        { priority: nextPriority },
                      );
                    }}
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
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      onBlur={() =>
                        void persistChanges(
                          { dueDate: dueDate || null },
                          { dueDate },
                        )
                      }
                      className="h-10 w-full rounded-lg border border-gray-200 py-2 pl-9 pr-2 text-sm"
                    />
                  </div>
                </label>
              </div>
              <TimeEstimateField
                value={timeEstimate}
                onChange={setTimeEstimate}
                onBlur={() =>
                  void persistChanges(
                    { timeEstimate: timeEstimate || null },
                    { timeEstimate },
                  )
                }
              />
            </fieldset>
            <TaskComments
              key={`${workspaceId}:${projectId}:${taskId ?? "new-task"}`}
              workspaceId={workspaceId}
              projectId={projectId}
              taskId={taskId}
              onActivityRefresh={() =>
                setHistoryRefreshVersion((version) => version + 1)
              }
            />
          </div>
          <TaskHistory
            key={taskId ?? "new-task"}
            workspaceId={workspaceId}
            projectId={projectId}
            taskId={taskId}
            members={members}
            refreshVersion={historyRefreshVersion}
          />
        </div>
        <footer className="flex shrink-0 justify-end border-t border-gray-100 bg-slate-50 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </footer>
      </section>
    </div>
  );
};

export default TaskDialog;
