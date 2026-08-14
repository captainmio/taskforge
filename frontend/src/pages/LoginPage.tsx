import { useState } from 'react'
import Textbox from '../components/ui/textbox'

const LoginPage = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-100">
            <section className="w-full max-w-md rounded-lg bg-white p-8 shadow">
                <h1 className='text-2xl font-bold rounded mb-6'>Log in</h1>
                <form>
                    <div>
                        <label className="block">Username:</label>
                        <Textbox type="text" name="username" className="mt-2" onChange={setUsername} />
                        <label className="block mt-2">Password:</label>
                        <Textbox type="text" name="password" className="mt-2"
                        onChange={setPassword}/>
                    </div>
                </form>
            </section>
        </main>
    )
}

export default LoginPage