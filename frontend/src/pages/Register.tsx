import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import { Link, redirect, useNavigate } from "react-router"
import Textbox from "../components/ui/Textbox"
import { useLoading } from "../hooks/useLoading";
import SubmitButton from "../components/ui/SubmitButton";
import { FaUser, FaEnvelope, FaUnlockAlt } from "react-icons/fa";
import { register } from "../services/auth";
import { toast } from "react-toastify";
import { applyApiValidationErrors, FORM_ERROR } from "../utils/apiError";

interface FormInput {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirm_password: string;
}

export const Register = () => {
  const navigate = useNavigate();
  const loading = useLoading();

  const { control, handleSubmit, watch, setError } = useForm<FormInput>({
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      confirm_password: ''
    }
  })

  const passwordValue = watch('password');

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    await loading.run(async () => {
      try {
        const response = await register(data);

        if(response.success) { 
          toast.success("Account successfully created");
          navigate('/', { replace: true });
        }

      } catch (error: unknown) {
        applyApiValidationErrors(error, setError);
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 shadow ">
        <div className="flex justify-end mb-6">
          <span className="text-sm text-content-text">Already have an account?<Link className="ml-1 text-site-green font-bold" to="/">Login</Link></span>
        </div>
        <h1 className="text-2xl font-bold">Create your Account</h1>
        <h3 className="mt-1 text-sm text-content-text">Fill in the details below to get started.</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex gap-4">
            <div className="w-full mt-4">
              <Controller
                name="firstname"
                control={control}
                rules={{
                  required: "First Name is required"
                }}
                render={({ field, fieldState: { error } }) => {
                  return (
                    <>
                      <Textbox icon={<FaUser />} placeholder="First Name" {...field} />
                      {error && <p style={{ color: "red" }}>{error.message}</p>}
                    </>
                  )
                }
                }
              />
            </div>
            <div className="w-full mt-4">
              <Controller
                name="lastname"
                control={control}
                rules={{
                  required: "Last Name is required"
                }}
                render={({ field, fieldState: { error } }) => {
                  return (
                    <>
                      <Textbox icon={<FaUser />} placeholder="Last Name" {...field} />
                      {error && <p style={{ color: "red" }}>{error.message}</p>}
                    </>
                  )
                }
                }
              />
            </div>
          </div>
          <div className="mt-4 gap-4">
            <Controller
                name="email"
                control={control}
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Invalid email address format"
                  }
                }}
                render={({ field, fieldState: { error } }) => {
                  return (
                    <>
                      <Textbox icon={<FaEnvelope />} placeholder="Email" {...field} />
                      {error && <p style={{ color: "red" }}>{error.message}</p>}
                    </>
                  )
                }
                }
              />
          </div>
          <div className="mt-4 gap-4">
            <Controller
                name="password"
                control={control}
                rules={{
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password should be more than 7 characters"
                  },
                }}
                render={({ field, fieldState: { error } }) => {
                  return (
                    <>
                      <Textbox icon={<FaUnlockAlt />} type="password" placeholder="Password" {...field} />
                      {error && <p style={{ color: "red" }}>{error.message}</p>}
                    </>
                  )
                }
                }
              />
          </div>
          <div className="mt-4 gap-4">
            <Controller
                name="confirm_password"
                control={control}
                rules={{
                  required: "Confirm Password is required",
                  validate: (value) => value === passwordValue || "Passwords do not match",
                }}
                render={({ field, fieldState: { error } }) => {
                  return (
                    <>
                      <Textbox icon={<FaUnlockAlt />} type="password" placeholder="Confirm Password" {...field} />
                      {error && <p style={{ color: "red" }}>{error.message}</p>}
                    </>
                  )
                }
                }
              />

          </div>
          <div className="mt-6 flex justify-center">
            <SubmitButton
              className="w-full cursor-pointer rounded-lg bg-site-green p-4 text-white"
              disabled={loading.isLoading}
            >
              Create account
            </SubmitButton>
          </div>
        </form>
      </section>
    </main>
  )
}

