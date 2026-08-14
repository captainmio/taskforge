import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import Textbox from "../components/ui/Textbox"
import SubmitButton from "../components/ui/SubmitButton"

interface FormInput {
    username: string,
    password: string
}

const LoginPage = () => {

    const { control, handleSubmit } = useForm<FormInput>({
        defaultValues: {
            username: '',
            password: ''
        },
    })

    const onSubmit: SubmitHandler<FormInput> = (data) => {
        setTimeout(function() {
            
        }, 3000)
        alert(JSON.stringify(data))
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-100">
            <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <Controller
                            name="username"
                            control={control}
                            render={({ field }) => {
                                return (
                                    <>
                                        <label className="block text-site-green font-bold">Username:</label>
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
                                        <label className="block mt-3 text-site-green font-bold">Password:</label>
                                        <Textbox {...field} type="password" className="mt-2" />
                                    </>
                                )
                            }
                            }
                        />
                    </div>
                    <div className="w-full flex justify-end mt-2">
                        <a href="#" className="text-gray-400">Forgot password?</a>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <SubmitButton className="w-full cursor-pointer rounded-lg bg-site-green p-4 text-white">
                            Log in
                        </SubmitButton>
                    </div>

                    <div className="w-full flex justify-center mt-4">
                        <span>
                            Don't have an account? <a href="#" className="text-site-green">Register new</a>
                        </span>
                    </div>
                </form>
            </section>
        </main>
    )
}

export default LoginPage