import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import AppHeader from "../../components/layout/AppHeader";
import ProjectForm, {
  type ProjectFormValues,
} from "../../components/projects/ProjectForm";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { createProject } from "../../services/projects";
import { getWorkspaceOverview } from "../../services/workspaces";
import { canCreateWorkspaceProjects } from "../../types/roles";

const CreateProjectSkeleton = () => (
  <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" role="status" aria-label="Loading create project form">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-72" /></div>
      <Skeleton className="h-10 w-40" />
    </div>
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <Skeleton className="h-6 w-40" />
      <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-28 w-full" /></div>
      <div className="flex justify-end gap-3"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-36" /></div>
    </section>
  </div>
);

const CreateProject = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthenticatedSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingAuthorization, setIsLoadingAuthorization] = useState(true);

  useEffect(() => {
    let isActive = true;

    if (!id) {
      navigate("/", { replace: true });
      return;
    }

    const verifyProjectCreationPermission = async () => {
      try {
        const response = await getWorkspaceOverview(id);
        const currentMember = response.data.members.find(
          (member) => member.id === currentUser.id,
        );
        const isAllowed =
          response.success && canCreateWorkspaceProjects(currentMember?.role);

        if (!isActive) return;

        if (isAllowed) {
          setIsAuthorized(true);
        } else {
          navigate(`/workspace/${id}/projects`, { replace: true });
        }
      } catch {
        if (isActive) navigate(`/workspace/${id}/projects`, { replace: true });
      } finally {
        if (isActive) setIsLoadingAuthorization(false);
      }
    };

    void verifyProjectCreationPermission();

    return () => {
      isActive = false;
    };
  }, [currentUser.id, id, navigate]);

  const handleCreateProject = async (
    values: ProjectFormValues,
  ): Promise<void> => {
    const response = await createProject(id, values);
    toast.success(response.message);
    navigate(`/workspace/${id}/projects`);
  };

  if (!isAuthorized) {
    return isLoadingAuthorization ? <CreateProjectSkeleton /> : null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppHeader
        title="Create Project"
        secondaryAction={(
          <Button
            variant="outline"
            leadingIcon={<FaArrowLeft />}
            onClick={() => navigate(`/workspace/${id}/projects`)}
          >
            Back to Projects
          </Button>
        )}
      />
      <ProjectForm
        onCancel={() => navigate(`/workspace/${id}/projects`)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

export default CreateProject;
