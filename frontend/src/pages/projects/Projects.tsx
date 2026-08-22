import { useEffect, useState } from "react";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import Button from "../../components/ui/Button";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { getWorkspaceOverview } from "../../services/workspaces";
import { canCreateWorkspaceProjects } from "../../types/roles";

const Projects = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthenticatedSession();
  const [canCreateProjects, setCanCreateProjects] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!id) return;

    const loadWorkspacePermission = async () => {
      try {
        const response = await getWorkspaceOverview(id);
        if (!isActive || !response.success) return;

        const currentMember = response.data.members.find(
          (member) => member.id === currentUser.id,
        );
        setCanCreateProjects(canCreateWorkspaceProjects(currentMember?.role));
      } catch {
        if (isActive) setCanCreateProjects(false);
      }
    };

    void loadWorkspacePermission();

    return () => {
      isActive = false;
    };
  }, [currentUser.id, id]);

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
    </div>
  );
};

export default Projects;
