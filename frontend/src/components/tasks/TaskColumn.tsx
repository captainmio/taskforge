import { FaEllipsisV, FaPlus } from "react-icons/fa";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Task, TaskStatus } from "./taskTypes";

interface TaskColumnProps {
  label: string;
  status: TaskStatus;
  dotClassName: string;
  surfaceClassName: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  canAddTask?: boolean;
}

const TaskColumn = ({
  label,
  status,
  dotClassName,
  surfaceClassName,
  tasks,
  onTaskClick,
  onAddTask,
  canAddTask = true,
}: TaskColumnProps) => (
  <Droppable droppableId={status}>
    {(provided) => (
      <section
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={`flex min-h-96 min-w-64 flex-1 flex-col rounded-xl border p-2.5 ${surfaceClassName}`}
      >
        <header className="flex items-center justify-between px-1.5 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <span className={`size-2 rounded-full ${dotClassName}`} />
            <span>{label}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-gray-600">
              {tasks.length}
            </span>
          </div>
        </header>
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onClick={onTaskClick}
            />
          ))}
          {provided.placeholder}
        </div>
        {canAddTask ? <button
          type="button"
          onClick={() => onAddTask(status)}
          className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <FaPlus aria-hidden="true" />
          Add task
        </button> : null}
      </section>
    )}
  </Droppable>
);

export default TaskColumn;
