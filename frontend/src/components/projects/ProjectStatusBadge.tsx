import Badge, { type BadgeVariant } from "../ui/Badge";
import type { ProjectStatus } from "../../types/workspace";

const statusPresentation: Record<
  ProjectStatus,
  { label: string; variant: BadgeVariant }
> = {
  planning: { label: "Planning", variant: "blue" },
  active: { label: "In progress", variant: "green" },
  on_hold: { label: "On hold", variant: "orange" },
  completed: { label: "Completed", variant: "purple" },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

const ProjectStatusBadge = ({ status }: ProjectStatusBadgeProps) => {
  const { label, variant } = statusPresentation[status];

  return <Badge variant={variant}>{label}</Badge>;
};

export default ProjectStatusBadge;
