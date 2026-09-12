import { useMemo, useState } from "react";
import { FaHistory } from "react-icons/fa";
import TaskHistoryChangeDetails from "../tasks/TaskHistoryChangeDetails";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import SectionCard from "../ui/SectionCard";
import type { WorkspaceRecentUpdate } from "../../types/workspace";
import { formatRelativeDateTime } from "../../utils/formatRelativeDateTime";

interface RecentUpdatesProps {
  updates: WorkspaceRecentUpdate[];
  allUpdates: WorkspaceRecentUpdate[];
  historyCursor: number | null;
  isLoadingHistory: boolean;
  onLoadHistory: (cursor?: number) => void;
}

interface MemberActivityDetails {
  memberId?: number;
  firstname?: string;
  lastname?: string;
}

interface ProjectActivityDetails {
  projectId?: number;
  name?: string;
}

const sortByNewest = (updates: WorkspaceRecentUpdate[]) =>
  [...updates].sort((left, right) => {
    const byDate =
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return byDate || String(right.id).localeCompare(String(left.id));
  });

const getMemberActivityDetails = (
  details: WorkspaceRecentUpdate["details"],
): MemberActivityDetails | null =>
  details && typeof details === "object" && !Array.isArray(details)
    ? (details as MemberActivityDetails)
    : null;

const getProjectActivityDetails = (
  details: WorkspaceRecentUpdate["details"],
): ProjectActivityDetails | null =>
  details && typeof details === "object" && !Array.isArray(details)
    ? (details as ProjectActivityDetails)
    : null;

const TaskActivityMessage = ({ update, modal = false }: { update: WorkspaceRecentUpdate; modal?: boolean }) => (
  <>
    {update.action === "commented"
      ? "added a comment to"
      : update.action === "created"
        ? "created"
        : "updated"}{" "}
    {modal ? (
      <strong className="font-semibold text-gray-950">{update.task?.title}</strong>
    ) : (
      "this task."
    )}
  </>
);

const MemberRemovedActivityMessage = ({ update }: { update: WorkspaceRecentUpdate }) => {
  const member = getMemberActivityDetails(update.details);
  const memberName = [member?.firstname, member?.lastname].filter(Boolean).join(" ");

  return (
    <>
      removed {memberName ? <strong className="font-semibold text-gray-950">{memberName}</strong> : "a member"} from this workspace.
    </>
  );
};

const MemberJoinedActivityMessage = () => <>joined this workspace.</>;

const MemberLeftActivityMessage = () => <>left this workspace.</>;

const ProjectActivityMessage = ({ update }: { update: WorkspaceRecentUpdate }) => {
  const project = getProjectActivityDetails(update.details);

  return (
    <>
      {update.action === "project_created" ? "created" : "deleted"} project{" "}
      <strong className="font-semibold text-gray-950">
        {project?.name ?? "a project"}
      </strong>
      .
    </>
  );
};

const ActivityMessage = ({ update, modal = false }: { update: WorkspaceRecentUpdate; modal?: boolean }) => {
  if (update.kind !== "workspace") return <TaskActivityMessage update={update} modal={modal} />;
  if (update.action === "member_joined") return <MemberJoinedActivityMessage />;
  if (update.action === "member_left") return <MemberLeftActivityMessage />;
  if (update.action === "project_created" || update.action === "project_deleted") {
    return <ProjectActivityMessage update={update} />;
  }
  return <MemberRemovedActivityMessage update={update} />;
};

const RecentUpdates = ({
  updates,
  allUpdates,
  historyCursor,
  isLoadingHistory,
  onLoadHistory,
}: RecentUpdatesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const sortedUpdates = useMemo(() => sortByNewest(updates), [updates]);
  const sortedHistory = useMemo(() => sortByNewest(allUpdates), [allUpdates]);

  const openHistory = () => {
    setIsOpen(true);
    if (!allUpdates.length) onLoadHistory();
  };

  return (
    <>
      <SectionCard
        title="Recent Updates"
        className="overflow-y-auto border-blue-100 bg-gradient-to-br from-white to-blue-50/60 shadow-sm"
        action={
          <button
            type="button"
            onClick={openHistory}
            className="cursor-pointer text-xs font-semibold text-green-700 hover:text-green-800"
          >
            View All
          </button>
        }
      >
        {sortedUpdates.length > 0 ? (
          <ul className="-m-4 divide-y divide-blue-100">
            {sortedUpdates.map((update) => (
              <li key={update.id} className="flex gap-3 px-4 py-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <FaHistory className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">
                    <strong className="font-semibold text-gray-950">{update.actor.firstname} {update.actor.lastname}</strong>{" "}
                    <ActivityMessage update={update} />
                  </p>
                  {update.kind !== "workspace" ? (
                    <>
                      <TaskHistoryChangeDetails changes={update.changes} valueKeyPrefix={`overview:${update.id}`} className="text-xs leading-5 text-gray-600" />
                      <p className="mt-0.5 truncate text-xs text-gray-500"><strong className="font-semibold text-gray-700">{update.task?.title}</strong> in {update.task?.project.name}</p>
                    </>
                  ) : null}
                </div>
                <time className="shrink-0 pt-0.5 text-right text-[11px] text-gray-400">{formatRelativeDateTime(update.createdAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">No recent updates.</p>
        )}
      </SectionCard>

      <Modal
        isOpen={isOpen}
        title="Recent Updates"
        onClose={() => setIsOpen(false)}
        footer={<Button variant="ghost" onClick={() => setIsOpen(false)}>Close</Button>}
      >
        <div className="max-h-[60vh] min-h-40 overflow-y-auto pr-1">
          {isLoadingHistory && !sortedHistory.length ? (
            <p className="text-sm text-gray-500">Loading updates…</p>
          ) : (
            <ol className="space-y-4">
              {sortedHistory.map((update) => (
                <li key={update.id} className="text-sm text-gray-700">
                  <p><strong className="font-semibold text-gray-950">{update.actor.firstname} {update.actor.lastname}</strong>{" "}<ActivityMessage update={update} modal /></p>
                  {update.kind !== "workspace" ? <TaskHistoryChangeDetails changes={update.changes} valueKeyPrefix={`modal:${update.id}`} className="text-xs leading-5 text-gray-600" /> : null}
                  <time className="mt-1 block text-[11px] text-gray-400">{formatRelativeDateTime(update.createdAt)}</time>
                </li>
              ))}
            </ol>
          )}
          {historyCursor ? <Button size="sm" variant="ghost" className="mt-4" disabled={isLoadingHistory} onClick={() => onLoadHistory(historyCursor)}>{isLoadingHistory ? "Loading…" : "Load more"}</Button> : null}
        </div>
      </Modal>
    </>
  );
};

export default RecentUpdates;
