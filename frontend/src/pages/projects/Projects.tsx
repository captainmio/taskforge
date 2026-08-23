import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaEdit,
  FaEllipsisV,
  FaFolder,
  FaPlus,
  FaSearch,
  FaTrashAlt,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import AppHeader from "../../components/layout/AppHeader";
import { projectIconOptions } from "../../components/projects/projectIconOptions";
import ProjectStatusBadge from "../../components/projects/ProjectStatusBadge";
import ProjectTabs from "../../components/projects/ProjectTabs";
import AvatarGroup, {
  type AvatarGroupMember,
} from "../../components/ui/AvatarGroup";
import Button from "../../components/ui/Button";
import DataTable, { type DataTableColumn } from "../../components/ui/DataTable";
import DropdownMenu from "../../components/ui/DropdownMenu";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import SectionCard from "../../components/ui/SectionCard";
import Skeleton from "../../components/ui/Skeleton";
import Textbox from "../../components/ui/Textbox";
import { deleteProject, getProjects } from "../../services/projects";
import { ProjectListTab, type ProjectListTab as ProjectListTabValue } from "../../types/project";
import { canCreateWorkspaceProjects } from "../../types/roles";
import type { WorkspaceProject } from "../../types/workspace";

const formatProjectDate = (value: string | null): string => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

// Project members and task progress are not in the API yet. Keep temporary
// display values deterministic so the listing layout does not change between
// renders while those backend fields are being designed.
const demoProjectMembers: readonly AvatarGroupMember[][] = [
  [
    { id: "alex", name: "Alex Morgan" },
    { id: "jamie", name: "Jamie Lee" },
    { id: "sam", name: "Sam Rivera" },
    { id: "taylor", name: "Taylor Kim" },
  ],
  [
    { id: "casey", name: "Casey Wilson" },
    { id: "jordan", name: "Jordan Bell" },
  ],
  [
    { id: "devon", name: "Devon Patel" },
    { id: "riley", name: "Riley Chen" },
    { id: "morgan", name: "Morgan Diaz" },
  ],
];

const demoProjectTaskCounts: ReadonlyArray<{ completed: number; total: number }> = [
  { completed: 8, total: 10 },
  { completed: 12, total: 24 },
  { completed: 5, total: 8 },
];

const getDemoProjectDetails = (projectId: number) => {
  const index = projectId % demoProjectMembers.length;
  const members = demoProjectMembers[index] ?? [];
  const tasks = demoProjectTaskCounts[index] ?? { completed: 0, total: 0 };

  return {
    members,
    tasks,
    progress: tasks.total === 0 ? 0 : (tasks.completed / tasks.total) * 100,
  };
};

const Projects = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [canCreateProjects, setCanCreateProjects] = useState(false);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<WorkspaceProject | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<ProjectListTabValue>(
    ProjectListTab.ALL,
  );

  useEffect(() => {
    let isActive = true;

    if (!id) return;

    const loadProjects = async () => {
      setIsLoading(true);

      try {
        const response = await getProjects(id);
        if (!isActive || !response.success) return;

        setProjects(response.data.projects);
        setCanCreateProjects(
          canCreateWorkspaceProjects(response.data.currentUserRole),
        );
      } catch {
        if (isActive) {
          setCanCreateProjects(false);
          setProjects([]);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadProjects();

    return () => {
      isActive = false;
    };
  }, [id]);

  const handleDeleteProject = async () => {
    if (!id || !projectToDelete || deletingProjectId !== null) return;

    setDeletingProjectId(projectToDelete.id);
    try {
      const response = await deleteProject(id, projectToDelete.id);
      setProjects((currentProjects) =>
        currentProjects.filter(({ id: projectId }) => projectId !== response.data.id),
      );
      setProjectToDelete(null);
      toast.success(response.message);
    } catch {
      // The shared API client displays the server error toast.
    } finally {
      setDeletingProjectId(null);
    }
  };

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesTab =
        selectedTab === ProjectListTab.ALL ||
        (selectedTab === ProjectListTab.PLANNING &&
          project.status === "planning") ||
        (selectedTab === ProjectListTab.ACTIVE && project.status === "active") ||
        (selectedTab === ProjectListTab.ON_HOLD &&
          project.status === "on_hold") ||
        (selectedTab === ProjectListTab.COMPLETED &&
          project.status === "completed");
      const matchesSearch =
        normalizedQuery.length === 0 ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery);

      return matchesTab && matchesSearch;
    });
  }, [projects, searchQuery, selectedTab]);

  const projectColumns: DataTableColumn<WorkspaceProject>[] = [
    {
      id: "project",
      header: "Project",
      className: "md:w-[30%]",
      cell: (project) => {
        const iconOption = projectIconOptions.find(
          (option) => option.id === project.icon,
        );

        return (
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4 ${
                iconOption?.className ?? "bg-gray-100 text-gray-600"
              }`}
              aria-hidden="true"
            >
              {iconOption?.icon ?? <FaFolder />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">
                {project.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {project.description || "No description provided."}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      className: "md:w-36",
      cell: (project) => <ProjectStatusBadge status={project.status} />,
    },
    {
      id: "members",
      header: "Members",
      className: "md:w-36",
      cell: (project) => (
        <AvatarGroup
          members={getDemoProjectDetails(project.id).members}
          label={`Temporary members for ${project.name}`}
        />
      ),
    },
    {
      id: "tasks",
      header: "Tasks",
      className: "md:w-24",
      cell: (project) => {
        const { completed, total } = getDemoProjectDetails(project.id).tasks;

        return (
          <span className="text-sm text-gray-600">
            {completed} / {total}
          </span>
        );
      },
    },
    {
      id: "progress",
      header: "Progress",
      className: "md:w-40",
      cell: (project) => (
        <ProgressBar
          value={getDemoProjectDetails(project.id).progress}
          label={`Temporary progress for ${project.name}`}
        />
      ),
    },
    {
      id: "start-date",
      header: "Start date",
      className: "md:w-36",
      cell: (project) => (
        <span className="text-sm text-gray-600">
          {formatProjectDate(project.startDate)}
        </span>
      ),
    },
    {
      id: "due-date",
      header: "Due date",
      className: "md:w-36",
      cell: (project) => (
        <span className="text-sm text-gray-600">
          {formatProjectDate(project.dueDate)}
        </span>
      ),
    },
  ];

  if (canCreateProjects) {
    projectColumns.push({
      id: "actions",
      header: "Actions",
      hideHeader: true,
      mobileFullWidth: true,
      className: "lg:w-16",
      cell: (project) => (
        <div className="flex w-full justify-end">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:hidden">
            <button
              type="button"
              className="inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 md:w-auto"
            >
              <FaEdit aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setProjectToDelete(project)}
              disabled={deletingProjectId !== null}
              className="inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              <FaTrashAlt aria-hidden="true" />
              {deletingProjectId === project.id ? "Deleting…" : "Delete"}
            </button>
          </div>
          <div className="hidden lg:block">
            <DropdownMenu
              menuClassName="w-36"
              triggerClassName="flex size-9 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              trigger={() => (
                <>
                  <FaEllipsisV aria-hidden="true" />
                  <span className="sr-only">Actions for {project.name}</span>
                </>
              )}
            >
              {(close) => (
                <div className="space-y-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={close}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <FaEdit aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      setProjectToDelete(project);
                    }}
                    disabled={deletingProjectId !== null}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaTrashAlt aria-hidden="true" />
                    {deletingProjectId === project.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              )}
            </DropdownMenu>
          </div>
        </div>
      ),
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppHeader
        title="Projects"
        secondaryAction={(
          <Button
            variant="outline"
            leadingIcon={<FaArrowLeft />}
            onClick={() => navigate(`/workspace/${id}`)}
          >
            Back to Overview
          </Button>
        )}
        primaryAction={canCreateProjects ? (
          <Button
            leadingIcon={<FaPlus />}
            onClick={() => navigate(`/workspace/${id}/projects/create`)}
          >
            Create project
          </Button>
        ) : undefined}
      />

      <SectionCard className="mt-7 border-emerald-100 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <ProjectTabs value={selectedTab} onChange={setSelectedTab} />
          <div className="w-full lg:max-w-xs">
            <label htmlFor="project-search" className="sr-only">
              Search projects
            </label>
            <Textbox
              id="project-search"
              type="search"
              icon={<FaSearch />}
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4" role="status" aria-label="Loading projects">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="grid gap-3 rounded-lg border border-gray-100 p-4 md:grid-cols-[minmax(0,2fr)_8rem_8rem_8rem]">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            ariaLabel="Projects"
            rows={filteredProjects}
            columns={projectColumns}
            getRowKey={(project) => project.id}
            emptyState={(
              <div className="py-12 text-center">
                <FaFolder
                  className="mx-auto size-7 text-gray-300"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  {projects.length === 0 ? "No projects yet" : "No projects found"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {projects.length === 0
                    ? "Projects will appear here after they are created."
                    : "Try changing the selected tab or search text."}
                </p>
              </div>
            )}
          />
        )}
      </SectionCard>
      <Modal
        isOpen={projectToDelete !== null}
        title="Delete project"
        onClose={() => {
          if (deletingProjectId === null) setProjectToDelete(null);
        }}
        footer={(
          <>
            <Button
              variant="ghost"
              disabled={deletingProjectId !== null}
              onClick={() => setProjectToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deletingProjectId !== null}
              onClick={() => void handleDeleteProject()}
            >
              {deletingProjectId !== null ? "Deleting…" : "Delete project"}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-950">{projectToDelete?.name}</span>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default Projects;
