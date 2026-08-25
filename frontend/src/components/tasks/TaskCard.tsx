import {
  FaCalendarAlt,
  FaCheckCircle,
  FaCode,
  FaDesktop,
  FaMobileAlt,
  FaRocket,
} from "react-icons/fa";
import { priorityPresentation, type Task } from "./taskTypes";

const projectIcons = {
  desktop: <FaDesktop />,
  mobile: <FaMobileAlt />,
  code: <FaCode />,
  marketing: <FaRocket />,
};

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

const TaskCard = ({ task, onClick }: TaskCardProps) => (
  <button
    type="button"
    onClick={() => onClick(task)}
    className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green"
  >
    <div className="flex items-start gap-2">
      {task.status === "done" ? (
        <FaCheckCircle
          className="mt-0.5 shrink-0 text-emerald-500"
          aria-label="Completed"
        />
      ) : null}
      <p className="min-w-0 flex-1 text-sm font-semibold text-gray-950">
        {task.title}
      </p>
    </div>
    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
      <span className="text-emerald-600" aria-hidden="true">
        {projectIcons[task.projectIcon]}
      </span>
      <span className="truncate">{task.project}</span>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
      <span
        className="flex size-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-white"
        aria-label={task.assignee}
      >
        {task.assignee.slice(0, 2).toUpperCase()}
      </span>
      <span className="flex items-center gap-1">
        <FaCalendarAlt aria-hidden="true" />
        {task.dueDate}
      </span>
      <span className="flex items-center gap-1">
        <span
          className={`size-1.5 rounded-full ${priorityPresentation[task.priority].dotClassName}`}
          aria-hidden="true"
        />
        {priorityPresentation[task.priority].label}
      </span>
    </div>
  </button>
);

export default TaskCard;
