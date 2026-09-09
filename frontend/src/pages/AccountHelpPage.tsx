import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { FaArrowLeft, FaEnvelope, FaKey } from "react-icons/fa";
import { Link } from "react-router";
import { toast } from "react-toastify";
import AppFooter from "../components/ui/AppFooter";
import SubmitButton from "../components/ui/SubmitButton";
import Textbox from "../components/ui/Textbox";
import { resendEmailVerification } from "../services/auth";

type HelpOption = "verification" | "password";

interface EmailFormValues {
  email: string;
}

const emailRules = {
  required: "Email address is required",
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Enter a valid email address",
  },
};

const AccountHelpPage = () => {
  const [activeOption, setActiveOption] = useState<HelpOption>("verification");
  const verificationForm = useForm<EmailFormValues>({
    defaultValues: { email: "" },
  });
  const passwordForm = useForm<EmailFormValues>({
    defaultValues: { email: "" },
  });

  const submitVerification: SubmitHandler<EmailFormValues> = async ({ email }) => {
    try {
      const response = await resendEmailVerification(email.trim().toLowerCase());
      toast.success(response.message);
    } catch {
      // The API client displays the specific server error as a toast.
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-content-text transition hover:text-site-green"
          >
            <FaArrowLeft aria-hidden="true" />
            Back to login
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-gray-950">Account help</h1>
          <p className="mt-1 text-sm leading-6 text-content-text">
            Choose the option that matches what you need. We will only ask for
            your email address.
          </p>

          <div
            className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1"
            role="tablist"
            aria-label="Account help options"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeOption === "verification"}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeOption === "verification"
                  ? "bg-white text-site-green shadow-sm"
                  : "text-gray-600 hover:text-gray-950"
              }`}
              onClick={() => setActiveOption("verification")}
            >
              Resend email
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeOption === "password"}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeOption === "password"
                  ? "bg-white text-site-green shadow-sm"
                  : "text-gray-600 hover:text-gray-950"
              }`}
              onClick={() => setActiveOption("password")}
            >
              Reset password
            </button>
          </div>

          {activeOption === "verification" ? (
            <form
              className="mt-6"
              noValidate
              onSubmit={verificationForm.handleSubmit(submitVerification)}
            >
              <div>
                <label htmlFor="verification-email" className="text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Textbox
                  id="verification-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  icon={<FaEnvelope />}
                  className="mt-1"
                  aria-invalid={Boolean(verificationForm.formState.errors.email)}
                  aria-describedby={
                    verificationForm.formState.errors.email
                      ? "verification-email-error"
                      : undefined
                  }
                  {...verificationForm.register("email", emailRules)}
                />
                {verificationForm.formState.errors.email ? (
                  <p id="verification-email-error" role="alert" className="mt-1 text-sm text-red-600">
                    {verificationForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-content-text">
                We will send a new link if this address belongs to an unverified account.
              </p>
              <SubmitButton
                className="mt-6 w-full cursor-pointer rounded-lg bg-site-green p-4 text-white"
                disabled={verificationForm.formState.isSubmitting}
              >
                {verificationForm.formState.isSubmitting
                  ? "Sending email..."
                  : "Send verification email"}
              </SubmitButton>
            </form>
          ) : (
            <form className="mt-6" noValidate onSubmit={passwordForm.handleSubmit(() => undefined)}>
              <div>
                <label htmlFor="password-reset-email" className="text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Textbox
                  id="password-reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  icon={<FaKey />}
                  className="mt-1"
                  disabled
                  {...passwordForm.register("email", emailRules)}
                />
              </div>
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                Password reset is being prepared and will be available soon.
              </p>
              <SubmitButton
                className="mt-6 w-full rounded-lg bg-site-green p-4 text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled
              >
                Send password reset link
              </SubmitButton>
            </form>
          )}
        </section>
      </main>
      <AppFooter />
    </div>
  );
};

export default AccountHelpPage;
