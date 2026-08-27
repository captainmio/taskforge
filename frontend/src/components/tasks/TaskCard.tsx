import { useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { Draggable } from "@hello-pangea/dnd";
import AvatarGroup from "../ui/AvatarGroup";
import { priorityPresentation, type Task } from "./taskTypes";

const DESCRIPTION_PREVIEW_LENGTH: number = 140;

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
}

const TaskCard = ({ task, index, onClick }: TaskCardProps) => {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState<boolean>(false);
  const description: string = task.description?.trim() ?? "";
  const isLongDescription: boolean = description.length > DESCRIPTION_PREVIEW_LENGTH;
  const descriptionPreview: string = isLongDescription
    ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`
    : description;

  return (
    <Draggable
    draggableId={`task-${task.id}`}
    index={index}
    disableInteractiveElementBlocking
  >
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        role="button"
        tabIndex={0}
        onClick={() => onClick(task)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onClick(task);
        }}
        className="w-full cursor-pointer active:cursor-grabbing rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green"
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
        {description ? (
          <div className="relative mt-2 flex items-start gap-1.5 text-xs leading-5 text-gray-500">
            <p className={isLongDescription ? "line-clamp-2 flex-1" : "flex-1"}>
              {descriptionPreview}
            </p>
            {isLongDescription ? (
              <button
                type="button"
                aria-label="Show full task description"
                aria-expanded={isDescriptionOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsDescriptionOpen((open) => !open);
                }}
                onMouseEnter={() => setIsDescriptionOpen(true)}
                onMouseLeave={() => setIsDescriptionOpen(false)}
                onFocus={() => setIsDescriptionOpen(true)}
                onBlur={() => setIsDescriptionOpen(false)}
                className="mt-0.5 shrink-0 cursor-pointer text-gray-400 hover:text-emerald-600 focus-visible:outline-2 focus-visible:outline-site-green"
              >
                <FaInfoCircle aria-hidden="true" />
              </button>
            ) : null}
            {isDescriptionOpen ? (
              <div
                role="tooltip"
                className="absolute right-0 top-6 z-20 w-64 rounded-lg bg-gray-950 p-3 text-xs leading-5 text-white shadow-lg sm:w-80"
              >
                {description}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
          {task.assignees?.length ? (
            <AvatarGroup
              members={task.assignees}
              label={`Assignees: ${task.assignee}`}
            />
          ) : null}
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
      </div>
    )}
    </Draggable>
  );
};

export default TaskCard;
