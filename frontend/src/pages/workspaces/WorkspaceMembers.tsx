import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaEdit,
  FaSearch,
  FaTrashAlt,
  FaUsers,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import AppHeader from "../../components/layout/AppHeader";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import DataTable, {
  type DataTableColumn,
  type DataTableSort,
} from "../../components/ui/DataTable";
import InitialsAvatar from "../../components/ui/InitialsAvatar";
import Modal from "../../components/ui/Modal";
import PaginationControls from "../../components/ui/PaginationControls";
import SectionCard from "../../components/ui/SectionCard";
import Textbox from "../../components/ui/Textbox";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { useLoading } from "../../hooks/useLoading";
import {
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  type RemoveWorkspaceMemberResponse,
  type UpdateWorkspaceMemberRoleResponse,
} from "../../services/workspaces";
import {
  WorkspaceMemberRole,
  WorkspaceRole,
  canManageWorkspaceMembers,
  isWorkspaceOwner,
  type WorkspaceMemberRole as WorkspaceMemberRoleValue,
  type WorkspaceRole as WorkspaceRoleValue,
} from "../../types/roles";
import type { WorkspaceMember } from "../../types/workspace";
import { parseAllowedValue } from "../../utils/allowedValue";

const roleLabels: Record<WorkspaceMemberRoleValue, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const roleBadgeVariants: Record<WorkspaceMemberRoleValue, BadgeVariant> = {
  OWNER: "green",
  ADMIN: "purple",
  MEMBER: "gray",
};

const memberRoleFilters = {
  ALL: "ALL",
  ...WorkspaceMemberRole,
} as const;

type MemberRoleFilter =
  (typeof memberRoleFilters)[keyof typeof memberRoleFilters];

const memberSortColumns = {
  NAME: "name",
  JOINED_AT: "joinedAt",
  ROLE: "role",
} as const;

const MEMBERS_PER_PAGE = 20;

const WorkspaceMembers = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthenticatedSession();
  const removalRequest = useLoading<RemoveWorkspaceMemberResponse>();
  const roleUpdateRequest = useLoading<UpdateWorkspaceMemberRoleResponse>();
  const [authorizedWorkspaceId, setAuthorizedWorkspaceId] = useState<
    string | null
  >(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserRole, setCurrentUserRole] =
    useState<WorkspaceMemberRoleValue>();
  const [page, setPage] = useState<number>(1);
  const [memberListRevision, setMemberListRevision] = useState<number>(0);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: MEMBERS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<MemberRoleFilter>("ALL");
  const [sort, setSort] = useState<DataTableSort | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<WorkspaceMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<WorkspaceRoleValue>(
    WorkspaceRole.MEMBER,
  );
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(
    null,
  );
  const basePath = `/workspace/${id}`;

  useEffect(() => {
    let isActive = true;

    if (!id) {
      navigate("/", { replace: true });
      return;
    }

    const loadMembers = async () => {
      setIsLoading(true);

      try {
        const response = await getWorkspaceMembers(id, {
          page,
          pageSize: MEMBERS_PER_PAGE,
        });
        if (!isActive) return;

        setMembers(response.data.members);
        setPagination(response.data.pagination);
        // The backend supplies the requester's role independently from the
        // current page, so admin controls remain correct even when that user's
        // own member record appears on a different page.
        setCurrentUserRole(response.data.currentUserRole);
        setAuthorizedWorkspaceId(id);
      } catch {
        if (isActive) navigate("/", { replace: true });
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadMembers();

    return () => {
      isActive = false;
    };
  }, [id, memberListRevision, navigate, page]);

  const canManageMembers = canManageWorkspaceMembers(currentUserRole);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchingMembers = members.filter((member) => {
      const fullName = `${member.firstname} ${member.lastname}`.toLowerCase();
      const matchesSearch =
        normalizedQuery.length === 0 ||
        fullName.includes(normalizedQuery) ||
        member.email.toLowerCase().includes(normalizedQuery);
      const matchesRole =
        roleFilter === memberRoleFilters.ALL || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    if (!sort) return matchingMembers;

    const direction = sort.direction === "ascending" ? 1 : -1;
    return [...matchingMembers].sort((firstMember, secondMember) => {
      let comparison = 0;

      if (sort.columnId === memberSortColumns.NAME) {
        const firstName = `${firstMember.firstname} ${firstMember.lastname}`;
        const secondName = `${secondMember.firstname} ${secondMember.lastname}`;
        comparison = firstName.localeCompare(secondName);
      } else if (sort.columnId === memberSortColumns.JOINED_AT) {
        comparison =
          new Date(firstMember.joinedAt).getTime() -
          new Date(secondMember.joinedAt).getTime();
      } else if (sort.columnId === memberSortColumns.ROLE) {
        comparison = roleLabels[firstMember.role].localeCompare(
          roleLabels[secondMember.role],
        );
      }

      return comparison * direction;
    });
  }, [members, roleFilter, searchQuery, sort]);

  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
    console.log("Workspace member search changed", {
      workspaceId: id,
      query: value,
    });
  };

  const handleRoleFilterChange = (value: string): void => {
    const nextFilter =
      parseAllowedValue(memberRoleFilters, value) ?? memberRoleFilters.ALL;
    setRoleFilter(nextFilter);
    console.log("Workspace member role filter changed", {
      workspaceId: id,
      role: nextFilter,
    });
  };

  const handleSortChange = (nextSort: DataTableSort): void => {
    setSort(nextSort);
    console.log("Workspace member sorting changed", {
      workspaceId: id,
      column: nextSort.columnId,
      direction: nextSort.direction,
    });
  };

  const openRoleModal = (member: WorkspaceMember): void => {
    if (isWorkspaceOwner(member.role) || member.id === currentUser.id) return;

    setMemberToEdit(member);
    setSelectedRole(member.role);
    console.log("Workspace member role editor opened", {
      workspaceId: id,
      memberId: member.id,
      currentRole: member.role,
    });
  };

  const closeRoleModal = (): void => {
    if (!roleUpdateRequest.isLoading) setMemberToEdit(null);
  };

  const confirmRoleUpdate = async (): Promise<void> => {
    if (!memberToEdit) return;

    const response = await roleUpdateRequest.run(() =>
      updateWorkspaceMemberRole(id, memberToEdit.id, { role: selectedRole }),
    );
    // The API interceptor reports failures. Leave the editor open so the
    // manager can retry the update or cancel it deliberately.
    if (!response) return;

    setMemberToEdit(null);
    toast.success(response.message);
    // Reload from the server so the table and the requester's permissions both
    // reflect the authoritative membership state after the role change.
    setMemberListRevision((revision) => revision + 1);
  };

  const openRemoveModal = (member: WorkspaceMember): void => {
    if (isWorkspaceOwner(member.role)) return;

    setMemberToRemove(member);
  };

  const closeRemoveModal = (): void => {
    if (!removalRequest.isLoading) setMemberToRemove(null);
  };

  const confirmMemberRemoval = async (): Promise<void> => {
    if (!memberToRemove) return;

    const response = await removalRequest.run(() =>
      removeWorkspaceMember(id, memberToRemove.id),
    );
    // The global API interceptor displays the backend error. Keep the member and
    // modal intact after failure so the manager can retry or cancel deliberately.
    if (!response) return;

    setMemberToRemove(null);
    toast.success(response.message);

    const remainingTotal = Math.max(0, pagination.total - 1);
    const lastRemainingPage = Math.max(
      1,
      Math.ceil(remainingTotal / pagination.pageSize),
    );

    if (page > lastRemainingPage) {
      // Deleting the only row on the final page makes that page invalid. Moving
      // back triggers the same member-list effect with the new valid page.
      setPage(lastRemainingPage);
    } else {
      // The backend cleared every cached member page after the delete. Trigger
      // a fresh GET so rows and pagination totals come from the updated database.
      setMemberListRevision((revision) => revision + 1);
    }
  };

  const columns: DataTableColumn<WorkspaceMember>[] = [
    {
      id: memberSortColumns.NAME,
      header: "Member",
      sortable: true,
      className: "md:w-[38%]",
      cell: (member) => {
        const fullName = `${member.firstname} ${member.lastname}`;
        const isCurrentUser = member.id === currentUser.id;

        return (
          <div className="flex min-w-0 items-center justify-end gap-3 md:justify-start">
            <InitialsAvatar value={fullName} />
            <div className="min-w-0 text-right md:text-left">
              <p className="truncate text-sm font-semibold text-gray-950">
                {fullName}{isCurrentUser ? " (You)" : ""}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {member.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: memberSortColumns.JOINED_AT,
      header: "Joined at",
      sortable: true,
      className: "md:w-40",
      cell: (member) => (
        <span className="block text-right text-sm text-gray-600 md:text-left">
          {new Date(member.joinedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: memberSortColumns.ROLE,
      header: "Role",
      sortable: true,
      className: "md:w-32",
      cell: (member) => (
        <div className="flex justify-end md:justify-start">
          <Badge variant={roleBadgeVariants[member.role]}>
            {roleLabels[member.role]}
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      className: "md:w-52",
      cell: (member) => {
        const ownerIsProtected = isWorkspaceOwner(member.role);
        const isCurrentUser = member.id === currentUser.id;

        return canManageMembers && !ownerIsProtected ? (
          <div className="flex justify-end gap-2">
            {!isCurrentUser ? (
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<FaEdit />}
                onClick={() => openRoleModal(member)}
              >
                Edit
              </Button>
            ) : null}
            <Button
              variant="danger"
              size="sm"
              leadingIcon={<FaTrashAlt />}
              onClick={() => openRemoveModal(member)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <span className="block text-right text-gray-300" aria-label="No actions available">
            —
          </span>
        );
      },
    },
  ];

  if (authorizedWorkspaceId !== id) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppHeader
        title="Member List"
        description="Find workspace members and review their access roles."
        secondaryAction={(
          <Button
            variant="outline"
            leadingIcon={<FaArrowLeft />}
            onClick={() => navigate(basePath)}
          >
            Back to Overview
          </Button>
        )}
      />

      <SectionCard
        title={`Workspace Members (${pagination.total})`}
        className="mt-7 border-blue-100 shadow-sm"
      >
        <div className="mb-5 grid gap-3 border-b border-gray-100 pb-5 md:grid-cols-[minmax(0,1fr)_13rem]">
          <div>
            <label htmlFor="member-search" className="sr-only">
              Search members
            </label>
            <Textbox
              id="member-search"
              type="search"
              icon={<FaSearch />}
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="member-role-filter" className="sr-only">
              Filter members by role
            </label>
            <select
              id="member-role-filter"
              value={roleFilter}
              onChange={(event) => handleRoleFilterChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-site-green focus:outline-none focus:ring-1 focus:ring-site-green"
            >
              <option value={memberRoleFilters.ALL}>All roles</option>
              <option value={WorkspaceMemberRole.OWNER}>Owner</option>
              <option value={WorkspaceMemberRole.ADMIN}>Admin</option>
              <option value={WorkspaceMemberRole.MEMBER}>Member</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center" role="status">
            <FaUsers
              className="mx-auto size-7 animate-pulse text-site-green"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-gray-700">
              Loading workspace members…
            </p>
          </div>
        ) : (
          <DataTable
            ariaLabel="Workspace members"
            rows={filteredMembers}
            columns={columns}
            getRowKey={(member) => member.id}
            sort={sort}
            onSortChange={handleSortChange}
            emptyState={(
              <div className="py-12 text-center">
                <FaUsers
                  className="mx-auto size-7 text-gray-300"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  {members.length === 0
                    ? "No workspace members"
                    : "No members found"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {members.length === 0
                    ? "Members will appear here after they join the workspace."
                    : "Try changing the search text or selected role."}
                </p>
              </div>
            )}
          />
        )}

        <PaginationControls
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.total}
          totalPages={pagination.totalPages}
          itemLabel="members"
          disabled={isLoading}
          onPageChange={setPage}
        />
      </SectionCard>

      <Modal
        isOpen={memberToEdit !== null}
        title="Update member role"
        onClose={closeRoleModal}
        footer={(
          <>
            <Button
              variant="ghost"
              disabled={roleUpdateRequest.isLoading}
              onClick={closeRoleModal}
            >
              Cancel
            </Button>
            <Button
              leadingIcon={<FaEdit />}
              disabled={
                roleUpdateRequest.isLoading ||
                selectedRole === memberToEdit?.role
              }
              onClick={() => void confirmRoleUpdate()}
            >
              {roleUpdateRequest.isLoading ? "Updating Role..." : "Update Role"}
            </Button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-gray-600">
          Choose the role for <strong>{memberToEdit?.firstname} {memberToEdit?.lastname}</strong>.
          The owner role cannot be assigned from this page.
        </p>
        <label
          htmlFor="updated-member-role"
          className="mt-5 block text-sm font-semibold text-gray-800"
        >
          Workspace role
        </label>
        <select
          id="updated-member-role"
          value={selectedRole}
          disabled={roleUpdateRequest.isLoading}
          onChange={(event) => {
            const role = parseAllowedValue(WorkspaceRole, event.target.value);
            if (role) setSelectedRole(role);
          }}
          className="mt-2 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-site-green focus:outline-none focus:ring-1 focus:ring-site-green"
        >
          <option value={WorkspaceRole.ADMIN}>Admin</option>
          <option value={WorkspaceRole.MEMBER}>Member</option>
        </select>
      </Modal>

      <Modal
        isOpen={memberToRemove !== null}
        title="Remove workspace member"
        onClose={closeRemoveModal}
        footer={(
          <>
            <Button
              variant="ghost"
              disabled={removalRequest.isLoading}
              onClick={closeRemoveModal}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              leadingIcon={<FaTrashAlt />}
              disabled={removalRequest.isLoading}
              onClick={() => void confirmMemberRemoval()}
            >
              {removalRequest.isLoading
                ? "Removing Member..."
                : "Remove Member"}
            </Button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-gray-600">
          Are you sure you want to remove <strong>{memberToRemove?.firstname} {memberToRemove?.lastname}</strong> from this workspace?
        </p>
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          They will lose access to workspace projects and tasks.
        </p>
      </Modal>
    </div>
  );
};

export default WorkspaceMembers;
