import { FaEnvelope, FaUnlockAlt, FaUser } from "react-icons/fa";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "react-toastify";
import SubmitButton from "../components/ui/SubmitButton";
import Textbox from "../components/ui/Textbox";
import {
  register as registerAccount,
  type RegisterPayload,
} from "../services/auth";
import { applyApiValidationErrors } from "../utils/apiError";

type RegistrationForm = RegisterPayload & {
  confirmPassword: string;
};

interface FieldErrorProps {
  id: string;
  message?: string;
}

const FieldError = ({ id, message }: FieldErrorProps) => {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  );
};

export const Register = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationForm>({
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit: SubmitHandler<RegistrationForm> = async (data) => {
    const payload: RegisterPayload = {
      firstname: data.firstname.trim(),
      lastname: data.lastname.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    };

    try {
      const response = await registerAccount(payload);

      if (response.success) {
        toast.success("Account successfully created");
        navigate("/", { replace: true });
      }
    } catch (error: unknown) {
      applyApiValidationErrors(error, setError);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 shadow">
        <div className="mb-6 flex justify-end">
          <span className="text-sm text-content-text">
            Already have an account?
            <Link className="ml-1 font-bold text-site-green" to="/">
              Login
            </Link>
          </span>
        </div>

        <h1 className="text-2xl font-bold">Create your Account</h1>
        <p className="mt-1 text-sm text-content-text">
          Fill in the details below to get started.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstname" className="text-sm font-medium text-gray-700">
                First name
              </label>
              <Textbox
                id="firstname"
                icon={<FaUser />}
                placeholder="First Name"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstname)}
                aria-describedby={errors.firstname ? "firstname-error" : undefined}
                className="mt-1"
                {...register("firstname", {
                  required: "First Name is required",
                  validate: (value) => value.trim().length > 0 || "First Name is required",
                  maxLength: {
                    value: 100,
                    message: "First Name must be 100 characters or fewer",
                  },
                })}
              />
              <FieldError id="firstname-error" message={errors.firstname?.message} />
            </div>

            <div>
              <label htmlFor="lastname" className="text-sm font-medium text-gray-700">
                Last name
              </label>
              <Textbox
                id="lastname"
                icon={<FaUser />}
                placeholder="Last Name"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastname)}
                aria-describedby={errors.lastname ? "lastname-error" : undefined}
                className="mt-1"
                {...register("lastname", {
                  required: "Last Name is required",
                  validate: (value) => value.trim().length > 0 || "Last Name is required",
                  maxLength: {
                    value: 100,
                    message: "Last Name must be 100 characters or fewer",
                  },
                })}
              />
              <FieldError id="lastname-error" message={errors.lastname?.message} />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <Textbox
              id="email"
              type="email"
              icon={<FaEnvelope />}
              placeholder="Email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="mt-1"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Invalid email address format",
                },
              })}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="mt-4">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <Textbox
              id="password"
              type="password"
              icon={<FaUnlockAlt />}
              placeholder="Password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="mt-1"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password should be more than 7 characters",
                },
              })}
            />
            <FieldError id="password-error" message={errors.password?.message} />
          </div>

          <div className="mt-4">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <Textbox
              id="confirmPassword"
              type="password"
              icon={<FaUnlockAlt />}
              placeholder="Confirm Password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              className="mt-1"
              {...register("confirmPassword", {
                required: "Confirm Password is required",
                validate: (value) => value === getValues("password") || "Passwords do not match",
              })}
            />
            <FieldError
              id="confirm-password-error"
              message={errors.confirmPassword?.message}
            />
          </div>

          <div className="mt-6 flex justify-center">
            <SubmitButton
              className="w-full cursor-pointer rounded-lg bg-site-green p-4 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </SubmitButton>
          </div>
        </form>
      </section>
    </main>
  );
};
