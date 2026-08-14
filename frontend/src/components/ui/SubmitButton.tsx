import type { ButtonHTMLAttributes } from "react";

interface SubmitButton extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
}

const SubmitButton = ({isLoading = false, ...props}: SubmitButton) => {
    const { children, type = "submit" } = props;
    return (
        <button {...props} type={type}>
            {isLoading ? '...Loading' : children}
        </button>
    )
}

export default SubmitButton