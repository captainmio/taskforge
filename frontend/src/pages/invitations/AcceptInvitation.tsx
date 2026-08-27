import { useState } from "react";
import axios from "axios";
import { FaEnvelopeOpenText } from "react-icons/fa";
import { Link, useSearchParams } from "react-router";
import SubmitButton from "../../components/ui/SubmitButton";
import SuccessState from "../../components/ui/SuccessState";
import AppFooter from "../../components/ui/AppFooter";
import {
  acceptWorkspaceInvitation,
  acceptWorkspaceInviteLink,
} from "../../services/invitations";

interface InvitationErrorResponse {
  error?: string;
}

type InvitationPageState =
  "ready" | "submitting" | "accepted" | "authentication-required" | "error";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const isSharedLink = searchParams.get("type") === "link";
  const [pageState, setPageState] = useState<InvitationPageState>("ready");
  const [acceptedWorkspaceName, setAcceptedWorkspaceName] =
    useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const invitationSearchParams = new URLSearchParams({ token });
  if (isSharedLink) invitationSearchParams.set("type", "link");
  const invitationPath: string = `/invitations/accept?${invitationSearchParams.toString()}`;
  const returnToQuery: string = `returnTo=${encodeURIComponent(invitationPath)}`;

  const acceptInvitation = async () => {
    if (!token) return;

    setPageState("submitting");
    setErrorMessage("");

    try {
      const response = isSharedLink
        ? await acceptWorkspaceInviteLink(token)
        : await acceptWorkspaceInvitation(token);
      setAcceptedWorkspaceName(response.workspace.displayName);
      setPageState("accepted");
    } catch (error: unknown) {
      if (axios.isAxiosError<InvitationErrorResponse>(error)) {
        if (error.response?.status === 401) {
          setPageState("authentication-required");
          return;
        }

        setErrorMessage(
          error.response?.data?.error ??
            "We could not accept this invitation. Please try again.",
        );
      } else {
        setErrorMessage(
          "We could not accept this invitation. Please try again.",
        );
      }

      setPageState("error");
    }
  };

  if (pageState === "accepted") {
    return (
      <div className="flex min-h-screen flex-col bg-gray-100">
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow">
            <SuccessState
              title="Invitation accepted"
              description={`You have joined ${acceptedWorkspaceName} and can now continue to your dashboard.`}
            />
            <Link
              to="/dashboard"
              className="mt-8 block rounded-lg bg-site-green p-4 text-center font-semibold text-white"
            >
              Go to dashboard
            </Link>
          </section>
        </main>
        <AppFooter />
      </div>
    );
  }

  const hasToken = token.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <section
          aria-labelledby="invitation-title"
          className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow"
        >
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50 text-site-green">
            <FaEnvelopeOpenText className="size-7" aria-hidden="true" />
          </span>

          <h1
            id="invitation-title"
            className="mt-6 text-2xl font-bold text-gray-900"
          >
            Workspace invitation
          </h1>

          {hasToken ? (
            <>
              <p className="mt-3 text-sm leading-6 text-content-text">
                You have been invited to join a workspace. Accept the invitation
                to continue collaborating with your team.
              </p>

              {pageState === "error" && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {errorMessage}
                </p>
              )}

              {pageState === "authentication-required" && (
                <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  <p role="alert">
                    {isSharedLink
                      ? "Sign in or create an account before accepting this invitation."
                      : "Sign in with the invited email address before accepting this invitation."}
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to={`/?${returnToQuery}`}
                      className="flex-1 rounded-lg bg-site-green px-4 py-3 font-semibold text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      to={`/register?${returnToQuery}`}
                      className="flex-1 rounded-lg border border-site-green px-4 py-3 font-semibold text-site-green"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              )}

              {pageState !== "authentication-required" && (
                <SubmitButton
                  type="button"
                  onClick={acceptInvitation}
                  disabled={pageState === "submitting"}
                  className="mt-6 w-full cursor-pointer rounded-lg bg-site-green p-4 font-semibold text-white"
                >
                  {pageState === "submitting"
                    ? "Accepting invitation..."
                    : "Accept invitation"}
                </SubmitButton>
              )}
            </>
          ) : (
            <>
              <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
                This invitation link is incomplete because its verification
                token is missing.
              </p>
              <p className="mt-3 text-sm text-content-text">
                Open the complete link from your invitation email or request a
                new invitation.
              </p>
            </>
          )}

          <Link
            to={hasToken ? `/?${returnToQuery}` : "/"}
            className="mt-6 inline-block text-sm font-semibold text-site-green"
          >
            Return to login
          </Link>
        </section>
      </main>
      <AppFooter />
    </div>
  );
};

export default AcceptInvitation;
