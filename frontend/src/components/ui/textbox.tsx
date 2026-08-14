import { useState, type ChangeEvent } from "react";

interface Textbox {
    type: string,
    name: string,
    className?: string,
    onChange: (value: string) => void
}

const Textbox = (props: Textbox) => {
    const { type, name, className, onChange } = props;

    const [value, setValue] = useState<string>('');


    const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        setValue(inputValue);

        onChange(inputValue);
    }

    return (
        <input 
            type={type} 
            name={name} 
            onChange={handleInput} 
            value={value} 
            className={`w-full p-2 border rounded block ${className}`} 
        />
    )
}

export default Textbox