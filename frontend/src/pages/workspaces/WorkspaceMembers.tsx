import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaEdit,
  FaSearch,
  FaTrashAlt,
  FaUsers,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import DataTable, {
  type DataTableColumn,
  type DataTableSort,
} from "../../components/ui/DataTable";
import InitialsAvatar from "../../components/ui/InitialsAvatar";
import Modal from "../../components/ui/Modal";
import SectionCard from "../../components/ui/SectionCard";
import Textbox from "../../components/ui/Textbox";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { getWorkspaceOverview } from "../../services/workspaces";
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

const WorkspaceMembers = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthenticatedSession();
  const [authorizedWorkspaceId, setAuthorizedWorkspaceId] = useState<
    string | null
  >(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
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
      try {
        // Temporary source until GET /workspaces/:workspaceId/members is added.
        // The prepared service contract will replace this overview request and
        // receive search, filter, sorting, and pagination values from this page.
        const response = await getWorkspaceOverview(id);
        if (!isActive) return;

        setMembers(response.data);
        setAuthorizedWorkspaceId(id);
      } catch {
        if (isActive) navigate("/", { replace: true });
      }
    };

    void loadMembers();

    return () => {
      isActive = false;
    };
  }, [id, navigate]);

  const currentMembership = members.find(
    (member) => member.id === currentUser.id,
  );
  const canManageMembers = canManageWorkspaceMembers(currentMembership?.role);

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
    if (isWorkspaceOwner(member.role)) return;

    setMemberToEdit(member);
    setSelectedRole(member.role);
    console.log("Workspace member role editor opened", {
      workspaceId: id,
      memberId: member.id,
      currentRole: member.role,
    });
  };

  const confirmRoleUpdate = (): void => {
    if (!memberToEdit) return;

    console.log("Workspace member role update requested", {
      workspaceId: id,
      memberId: memberToEdit.id,
      previousRole: memberToEdit.role,
      nextRole: selectedRole,
    });
    // Future API: PATCH /workspaces/:workspaceId/members/:memberId
    // Request body: { role: selectedRole }. Until the backend endpoint exists,
    // logging verifies that the modal provides the correct IDs and selected role.
    setMemberToEdit(null);
  };

  const openRemoveModal = (member: WorkspaceMember): void => {
    if (isWorkspaceOwner(member.role)) return;

    setMemberToRemove(member);
    console.log("Workspace member removal confirmation opened", {
      workspaceId: id,
      memberId: member.id,
      email: member.email,
    });
  };

  const confirmMemberRemoval = (): void => {
    if (!memberToRemove) return;

    console.log("Workspace member removal requested", {
      workspaceId: id,
      memberId: memberToRemove.id,
      email: memberToRemove.email,
    });
    // Future API: DELETE /workspaces/:workspaceId/members/:memberId. The member
    // remains visible for now because no backend deletion has taken place.
    setMemberToRemove(null);
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

        return canManageMembers && !ownerIsProtected ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<FaEdit />}
              onClick={() => openRoleModal(member)}
            >
              Edit
            </Button>
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
        title={`Workspace Members (${members.length})`}
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

        <DataTable
          ariaLabel="Workspace members"
          rows={filteredMembers}
          columns={columns}
          getRowKey={(member) => member.id}
          sort={sort}
          onSortChange={handleSortChange}
          emptyState={(
            <div className="py-12 text-center">
            <FaUsers className="mx-auto size-7 text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-700">
              {members.length === 0 ? "No workspace members" : "No members found"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {members.length === 0
                ? "Members will appear here after they join the workspace."
                : "Try changing the search text or selected role."}
            </p>
            </div>
          )}
        />
      </SectionCard>

      <Modal
        isOpen={memberToEdit !== null}
        title="Update member role"
        onClose={() => setMemberToEdit(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setMemberToEdit(null)}>
              Cancel
            </Button>
            <Button leadingIcon={<FaEdit />} onClick={confirmRoleUpdate}>
              Update Role
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
        onClose={() => setMemberToRemove(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              leadingIcon={<FaTrashAlt />}
              onClick={confirmMemberRemoval}
            >
              Remove Member
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
