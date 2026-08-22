import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import Button from "../../components/ui/Button";

const Projects = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();

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
        primaryAction={(
          <Button
            leadingIcon={<FaPlus />}
            onClick={() => navigate(`/workspace/${id}/projects/create`)}
          >
            Create project
          </Button>
        )}
      />
    </div>
  );
};

export default Projects;
