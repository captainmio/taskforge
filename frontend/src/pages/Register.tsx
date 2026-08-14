import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import { Link } from "react-router"
import Textbox from "../components/ui/Textbox"
import { useLoading } from "../hooks/useLoading";
import SubmitButton from "../components/ui/SubmitButton";
import { FaEnvelope } from "react-icons/fa";

interface FormInput {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirm_password: string;
}

export const Register = () => {

  const loading = useLoading();

  const { control, handleSubmit } = useForm<FormInput>({
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      confirm_password: ''
    }
  })

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    await loading.run(async () => {
      // await login(data);
      alert(JSON.stringify(data));
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
                render={({ field }) => {
                  return (
                    <>
                      <Textbox placeholder="First Name" {...field} />
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
                render={({ field }) => {
                  return (
                    <>
                      <Textbox placeholder="Last Name" {...field} />
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
                render={({ field }) => {
                  return (
                    <>
                      <Textbox type="email" placeholder="Email" {...field} />
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
                render={({ field }) => {
                  return (
                    <>
                      <Textbox type="password" placeholder="Password" {...field} />
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
                render={({ field }) => {
                  return (
                    <>
                      <Textbox icon={<FaEnvelope />} type="password" placeholder="Confirm Password" {...field} />
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

