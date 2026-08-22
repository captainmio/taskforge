import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import ProjectForm from "../../components/projects/ProjectForm";
import Button from "../../components/ui/Button";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { getWorkspaceOverview } from "../../services/workspaces";
import { canCreateWorkspaceProjects } from "../../types/roles";

const CreateProject = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthenticatedSession();
  const [isAuthorized, setIsAuthorized] = useState(false);

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
      }
    };

    void verifyProjectCreationPermission();

    return () => {
      isActive = false;
    };
  }, [currentUser.id, id, navigate]);

  if (!isAuthorized) return null;

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
      <ProjectForm onCancel={() => navigate(`/workspace/${id}/projects`)} />
    </div>
  );
};

export default CreateProject;
