import type { ReactNode } from "react";
import { FaBriefcase, FaCode, FaFlag, FaRocket, FaUsers } from "react-icons/fa";
import { WorkspaceIcon, type WorkspaceIcon as WorkspaceIconValue } from "../../types/workspace";

export interface WorkspaceIconOption {
  id: WorkspaceIconValue;
  label: string;
  icon: ReactNode;
  className: string;
}

export const workspaceIconOptions = [
  { id: WorkspaceIcon.CODE, label: "Code workspace", icon: <FaCode />, className: "bg-green-50 text-site-green" },
  { id: WorkspaceIcon.BUSINESS, label: "Business workspace", icon: <FaBriefcase />, className: "bg-blue-50 text-blue-500" },
  { id: WorkspaceIcon.TEAM, label: "Team workspace", icon: <FaUsers />, className: "bg-purple-50 text-purple-500" },
  { id: WorkspaceIcon.LAUNCH, label: "Launch workspace", icon: <FaRocket />, className: "bg-orange-50 text-orange-500" },
  { id: WorkspaceIcon.GOALS, label: "Goals workspace", icon: <FaFlag />, className: "bg-red-50 text-red-500" },
] as const satisfies readonly WorkspaceIconOption[];

export const getWorkspaceIconOption = (
  iconId: WorkspaceIconValue
): WorkspaceIconOption => {
  return workspaceIconOptions.find((option) => option.id === iconId) ?? workspaceIconOptions[0];
};
