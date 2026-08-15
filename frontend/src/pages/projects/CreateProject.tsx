import { Link } from "react-router";

const CreateProject = () => {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Hello Project</h1>
      <Link
        to="/create-workspace"
        className="mt-4 inline-block text-site-green underline underline-offset-4"
      >
        Back to create workspace
      </Link>
    </main>
  );
};

export default CreateProject;
