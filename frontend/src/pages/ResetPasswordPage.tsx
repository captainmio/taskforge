import { useForm, type SubmitHandler } from "react-hook-form";
import { FaArrowLeft, FaLock } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "react-toastify";
import AppFooter from "../components/ui/AppFooter";
import SubmitButton from "../components/ui/SubmitButton";
import Textbox from "../components/ui/Textbox";
import { resetPassword } from "../services/auth";

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit: SubmitHandler<ResetPasswordFormValues> = async ({ password }) => {
    if (!token) return;

    try {
      const response = await resetPassword(token, password);
      toast.success(response.message);
      navigate("/", { replace: true });
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

          <h1 className="mt-6 text-2xl font-bold text-gray-950">Create a new password</h1>
          <p className="mt-1 text-sm leading-6 text-content-text">
            Choose a strong password you have not used elsewhere.
          </p>

          {!token ? (
            <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              This password reset link is incomplete. Request a new one from account help.
            </p>
          ) : (
            <form className="mt-6" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                  New password
                </label>
                <Textbox
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  icon={<FaLock />}
                  className="mt-1"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "new-password-error" : undefined}
                  {...register("password", {
                    required: "New password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                />
                {errors.password ? (
                  <p id="new-password-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <Textbox
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  icon={<FaLock />}
                  className="mt-1"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                  {...register("confirmPassword", {
                    required: "Please confirm your new password",
                    validate: (value) =>
                      value === getValues("password") || "Passwords do not match",
                  })}
                />
                {errors.confirmPassword ? (
                  <p id="confirm-password-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              <SubmitButton
                className="mt-6 w-full cursor-pointer rounded-lg bg-site-green p-4 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving password..." : "Save new password"}
              </SubmitButton>
            </form>
          )}
        </section>
      </main>
      <AppFooter />
    </div>
  );
};

export default ResetPasswordPage;
