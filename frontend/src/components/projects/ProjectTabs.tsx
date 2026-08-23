import {
  ProjectListTab,
  type ProjectListTab as ProjectListTabValue,
} from "../../types/project";

const projectTabs: ReadonlyArray<{ id: ProjectListTabValue; label: string }> = [
  { id: ProjectListTab.ALL, label: "All Projects" },
  { id: ProjectListTab.PLANNING, label: "Planning" },
  { id: ProjectListTab.ACTIVE, label: "Active" },
  { id: ProjectListTab.ON_HOLD, label: "On Hold" },
  { id: ProjectListTab.COMPLETED, label: "Completed" },
];

interface ProjectTabsProps {
  value: ProjectListTabValue;
  onChange: (tab: ProjectListTabValue) => void;
}

const ProjectTabs = ({ value, onChange }: ProjectTabsProps) => (
  <div
    className="flex gap-1 border-b border-gray-200"
    role="tablist"
    aria-label="Project status"
  >
    {projectTabs.map((tab) => {
      const isSelected = value === tab.id;

      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isSelected}
          onClick={() => onChange(tab.id)}
          className={`cursor-pointer border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
            isSelected
              ? "border-site-green text-site-green"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default ProjectTabs;
