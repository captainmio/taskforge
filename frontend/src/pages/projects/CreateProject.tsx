import { Link } from "react-router";
import AppFooter from "../../components/ui/AppFooter";

const CreateProject = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">Hello Project</h1>
        <Link
          to="/create-workspace"
          className="mt-4 inline-block text-site-green underline underline-offset-4"
        >
          Back to create workspace
        </Link>
      </main>
      <AppFooter />
    </div>
  );
};

export default CreateProject;
