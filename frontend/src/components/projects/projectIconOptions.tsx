import type { ReactNode } from "react";
import {
  FaBug,
  FaBullhorn,
  FaChartLine,
  FaCode,
  FaDatabase,
  FaDesktop,
  FaFlag,
  FaMobileAlt,
  FaPaintBrush,
  FaRocket,
  FaServer,
  FaShoppingCart,
} from "react-icons/fa";

export type ProjectIcon =
  | "desktop"
  | "mobile"
  | "code"
  | "launch"
  | "flag"
  | "database"
  | "server"
  | "design"
  | "analytics"
  | "marketing"
  | "commerce"
  | "quality";

interface ProjectIconOption {
  id: ProjectIcon;
  label: string;
  icon: ReactNode;
  className: string;
}

export const projectIconOptions = [
  {
    id: "desktop",
    label: "Web application",
    icon: <FaDesktop />,
    className: "bg-green-50 text-site-green",
  },
  {
    id: "mobile",
    label: "Mobile application",
    icon: <FaMobileAlt />,
    className: "bg-blue-50 text-blue-500",
  },
  {
    id: "code",
    label: "Software development",
    icon: <FaCode />,
    className: "bg-purple-50 text-purple-500",
  },
  {
    id: "launch",
    label: "Product launch",
    icon: <FaRocket />,
    className: "bg-orange-50 text-orange-500",
  },
  {
    id: "flag",
    label: "Project milestone",
    icon: <FaFlag />,
    className: "bg-red-50 text-red-500",
  },
  {
    id: "database",
    label: "Data project",
    icon: <FaDatabase />,
    className: "bg-cyan-50 text-cyan-600",
  },
  {
    id: "server",
    label: "Infrastructure project",
    icon: <FaServer />,
    className: "bg-slate-100 text-slate-600",
  },
  {
    id: "design",
    label: "Design project",
    icon: <FaPaintBrush />,
    className: "bg-pink-50 text-pink-500",
  },
  {
    id: "analytics",
    label: "Analytics project",
    icon: <FaChartLine />,
    className: "bg-indigo-50 text-indigo-500",
  },
  {
    id: "marketing",
    label: "Marketing campaign",
    icon: <FaBullhorn />,
    className: "bg-amber-50 text-amber-600",
  },
  {
    id: "commerce",
    label: "E-commerce project",
    icon: <FaShoppingCart />,
    className: "bg-teal-50 text-teal-600",
  },
  {
    id: "quality",
    label: "Quality assurance",
    icon: <FaBug />,
    className: "bg-rose-50 text-rose-500",
  },
] as const satisfies readonly ProjectIconOption[];
