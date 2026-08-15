import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import Textbox from "../components/ui/Textbox"
import SubmitButton from "../components/ui/SubmitButton"
import { useLoading } from "../hooks/useLoading"
import { login } from "../services/auth"
import { Link, useNavigate } from "react-router"

interface FormInput {
    email: string;
    password: string;
}

const LoginPage = () => {

    const { control, handleSubmit } = useForm<FormInput>({
        defaultValues: {
            email: '',
            password: ''
        },
    })

    const loading = useLoading();
    const navigate = useNavigate();

    const onSubmit: SubmitHandler<FormInput> = async (data) => {
        await loading.run(async () => {
            const response = await login(data);

            if (response.success) {
                navigate("/dashboard");
            }
        });
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-100">
            <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => {
                                return (
                                    <>
                                        <label htmlFor="email" className="block text-site-green font-bold">Email address:</label>
                                        <Textbox {...field} className="mt-2" />
                                    </>
                                )
                            }
                            }
                        />
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => {
                                return (
                                    <>
                                        <label htmlFor="password" className="block mt-3 text-site-green font-bold">Password:</label>
                                        <Textbox {...field} type="password" className="mt-2" />
                                    </>
                                )
                            }
                            }
                        />
                    </div>
                    <div className="w-full flex justify-end mt-2">
                        <a href="#" className="text-content-text">Forgot password?</a>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <SubmitButton 
                            className="w-full cursor-pointer rounded-lg bg-site-green p-4 text-white"
                            disabled={loading.isLoading}
                        >
                            Log in
                        </SubmitButton>
                    </div>

                    <div className="w-full flex justify-center mt-4">
                        <span className="text-content-text">
                            Don't have an account? 
                            <Link className="ml-1 text-site-green font-bold" to="/register">Register new</Link>
                        </span>
                    </div>
                </form>
            </section>
        </main>
    )
}

export default LoginPage
