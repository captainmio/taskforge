import TaskColumn from "./TaskColumn";
import { taskColumns, type Task, type TaskStatus } from "./taskTypes";

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

const TaskBoard = ({ tasks, onTaskClick, onAddTask }: TaskBoardProps) => (
  <div className="grid gap-4 xl:grid-cols-4">
    {taskColumns.map((column) => (
      <TaskColumn
        key={column.status}
        {...column}
        tasks={tasks.filter(
          (task: { status: string }) => task.status === column.status,
        )}
        onTaskClick={onTaskClick}
        onAddTask={onAddTask}
      />
    ))}
  </div>
);

export default TaskBoard;
