import { FaCalendarAlt, FaExchangeAlt, FaFlag, FaUser } from "react-icons/fa";

const historyItems = [
  {
    icon: FaFlag,
    iconClassName: "bg-amber-100 text-amber-600",
    description: "changed priority from Medium to High",
    user: "Rustam Jordan",
    time: "Today, 10:32 AM",
  },
  {
    icon: FaCalendarAlt,
    iconClassName: "bg-blue-100 text-blue-600",
    description: "changed due date from Jun 25 to Jun 30",
    user: "Alex Morgan",
    time: "Yesterday, 2:14 PM",
  },
  {
    icon: FaUser,
    iconClassName: "bg-violet-100 text-violet-600",
    description: "assigned the task to Rustam Jordan",
    user: "Jamie Lee",
    time: "Jun 18, 9:41 AM",
  },
  {
    icon: FaExchangeAlt,
    iconClassName: "bg-emerald-100 text-emerald-600",
    description: "moved the task to In Progress",
    user: "Rustam Jordan",
    time: "Jun 17, 4:20 PM",
  },
] as const;

const TaskHistory = () => (
  <aside className="border-t border-gray-100 bg-slate-50/70 p-6 lg:border-l lg:border-t-0">
    <h3 className="text-sm font-bold text-gray-950">Task History</h3>
    <p className="mt-1 text-xs text-gray-500">Changes to this task.</p>
    <ol className="mt-6 space-y-6">
      {historyItems.map(({ icon: Icon, iconClassName, description, user, time }) => (
        <li key={`${user}-${time}`} className="relative flex gap-3">
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${iconClassName}`}><Icon className="size-3" aria-hidden="true" /></span>
          <div className="min-w-0 text-xs leading-5 text-gray-600"><p><span className="font-semibold text-gray-800">{user}</span> {description}</p><time className="mt-1 block text-[11px] text-gray-400">{time}</time></div>
        </li>
      ))}
    </ol>
  </aside>
);

export default TaskHistory;
