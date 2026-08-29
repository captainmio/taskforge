import TaskColumn from "./TaskColumn";
import { taskColumns, type Task, type TaskStatus } from "./taskTypes";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onDragEnd?: (result: DropResult) => void;
}

const TaskBoard = ({
  tasks,
  onTaskClick,
  onAddTask,
  onDragEnd = () => undefined,
}: TaskBoardProps) => (
  <DragDropContext onDragEnd={onDragEnd}>
    <div className="grid gap-4 xl:grid-cols-4">
      {taskColumns.map((column) => (
        <TaskColumn
          key={column.status}
          {...column}
          tasks={tasks
            .filter((task: { status: string }) => task.status === column.status)
            .toSorted(
              (first, second) =>
                (first.position ?? Number.MAX_SAFE_INTEGER) -
                  (second.position ?? Number.MAX_SAFE_INTEGER) ||
                first.id - second.id,
            )}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
        />
      ))}
    </div>
  </DragDropContext>
);

export default TaskBoard;
