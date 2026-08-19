import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  FaArrowLeft,
  FaEnvelope,
  FaLink,
  FaPaperPlane,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import Button from "../../components/ui/Button";
import InitialsAvatar from "../../components/ui/InitialsAvatar";
import Textbox from "../../components/ui/Textbox";
import { getWorkspaceOverview } from "../../services/workspaces";
import {
  WorkspaceRole,
  type WorkspaceRole as WorkspaceRoleValue,
} from "../../types/roles";
import { parseAllowedValue } from "../../utils/allowedValue";

interface PendingInvitation {
  email: string;
  role: WorkspaceRoleValue;
}

interface InviteMembersFormValues {
  email: string;
  role: WorkspaceRoleValue;
  invitations: PendingInvitation[];
}

const roleLabel = (role: WorkspaceRoleValue): string =>
  role === WorkspaceRole.ADMIN ? "Admin" : "Member";

const InviteMembers = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [authorizedWorkspaceId, setAuthorizedWorkspaceId] = useState<
    string | null
  >(null);
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    resetField,
  } = useForm<InviteMembersFormValues>({
    defaultValues: {
      email: "",
      role: WorkspaceRole.MEMBER,
      invitations: [],
    },
    mode: "onTouched",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "invitations",
  });

  const workspaceName: string = "TaskForge Dev";
  const basePath: string = `/workspace/${id}`;

  useEffect(() => {
    let isActive = true;

    if (!id) {
      navigate("/", { replace: true });
      return;
    }

    const authorizeWorkspace = async () => {
      try {
        const response = await getWorkspaceOverview(id);

        if (!isActive) return;

        if (!response.success) {
          navigate("/", { replace: true });
          return;
        }

        setAuthorizedWorkspaceId(id);
      } catch {
        if (isActive) navigate("/", { replace: true });
      }
    };

    void authorizeWorkspace();

    return () => {
      isActive = false;
    };
  }, [id, navigate]);

  const addInvitation = (values: InviteMembersFormValues): void => {
    append({ email: values.email, role: values.role });
    resetField("email");
    resetField("role", { defaultValue: WorkspaceRole.MEMBER });
  };

  if (authorizedWorkspaceId !== id) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AppHeader
          title="Invite Members"
          description={`Invite people to join ${workspaceName} and start collaborating.`}
          secondaryAction={(
            <Button
              variant="outline"
              leadingIcon={<FaArrowLeft />}
              onClick={() => navigate(basePath)}
            >
              Back to Members
            </Button>
          )}
        />

        <section className="mt-7 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-5 sm:p-7">
            <h2 className="text-xl font-bold text-gray-950">
              Add people by email
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter an email address and choose their role in this workspace.
            </p>

            <form
              className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_auto]"
              onSubmit={(event) => void handleSubmit(addInvitation)(event)}
              noValidate
            >
              <div>
                <label htmlFor="invite-email" className="sr-only">
                  Email address
                </label>
                <Textbox
                  id="invite-email"
                  type="email"
                  icon={<FaEnvelope />}
                  placeholder="Enter email address"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "invite-email-error" : undefined}
                  className={
                    errors.email ? "ring-red-500 focus:ring-red-500" : ""
                  }
                  {...register("email", {
                    required: "Email address is required.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address.",
                    },
                    setValueAs: (value: string) => value.trim().toLowerCase(),
                    validate: (value) =>
                      !getValues("invitations").some(
                        (invitation) => invitation.email === value,
                      ) ||
                      "This email address is already in the invitation list.",
                  })}
                />
                {errors.email ? (
                  <p
                    id="invite-email-error"
                    className="mt-2 text-xs font-medium text-red-600"
                    role="alert"
                  >
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <label className="sr-only" htmlFor="invite-role">
                Workspace role
              </label>
              <select
                id="invite-role"
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-site-green focus:outline-none focus:ring-1 focus:ring-site-green"
                {...register("role", {
                  setValueAs: (value: string) =>
                    parseAllowedValue(WorkspaceRole, value) ??
                    WorkspaceRole.MEMBER,
                })}
              >
                <option value={WorkspaceRole.MEMBER}>Member</option>
                <option value={WorkspaceRole.ADMIN}>Admin</option>
              </select>

              <Button
                type="submit"
                leadingIcon={<FaPlus />}
                className="lg:self-start"
              >
                Add
              </Button>
            </form>

            <div className="mt-9">
              <h3 className="text-base font-bold text-gray-950">
                People to invite ({fields.length})
              </h3>

              {fields.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                  <div className="hidden grid-cols-[minmax(0,1fr)_11rem_3rem] gap-4 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 sm:grid">
                    <span>Email address</span>
                    <span>Role</span>
                    <span className="sr-only">Actions</span>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {fields.map((invitation, index) => (
                      <li
                        key={invitation.id}
                        className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_11rem_3rem] sm:items-center sm:gap-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <InitialsAvatar
                            value={invitation.email}
                            className="bg-emerald-50 text-site-green"
                          />
                          <span className="truncate text-sm font-medium text-gray-900">
                            {invitation.email}
                          </span>
                        </div>

                        <span
                          aria-label={`Role for ${invitation.email}: ${roleLabel(invitation.role)}`}
                          className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700"
                        >
                          {roleLabel(invitation.role)}
                        </span>

                        <button
                          type="button"
                          onClick={() => remove(index)}
                          aria-label={`Remove ${invitation.email}`}
                          className="flex size-10 items-center justify-center justify-self-end rounded-lg bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                        >
                          <FaTrash className="size-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
                  <FaEnvelope
                    className="mx-auto size-6 text-gray-300"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    No people added yet
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Add an email address above to prepare an invitation.
                  </p>
                </div>
              )}
            </div>
          </div>

          <footer className="flex justify-end border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-7">
            <Button
              leadingIcon={<FaPaperPlane />}
              disabled
              title="The send-invitations API is not available yet"
              className="sm:min-w-56"
            >
              Send Invitations
            </Button>
          </footer>
        </section>

        <section className="mt-5 flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <h2 className="text-lg font-bold text-gray-950">
              Invite with a link
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Share a link with anyone. They can request to join this workspace.
            </p>
          </div>
          <Button
            variant="outline"
            leadingIcon={<FaLink />}
            disabled
            title="The invite-link API is not available yet"
            className="sm:shrink-0"
          >
            Generate invite link
          </Button>
        </section>
    </div>
  );
};

export default InviteMembers;
