import { type InputHTMLAttributes } from "react";

interface Textbox extends InputHTMLAttributes<HTMLInputElement> {
    className?: string
}

const Textbox = (props: Textbox) => {
    const { className = "" } = props;

    return (
        <input 
            {...props}
            className={`w-full p-2 border rounded block ${className}`} 
        />
    )
}

export default Textbox