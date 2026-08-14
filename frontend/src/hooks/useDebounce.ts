import { useState, useEffect } from 'react';

interface debounce {
    value: string;
    delay?: number;
}

export const useDebounce = (props: debounce) => {
    const { value, delay = 0 } = props
    const [debouncedValue, setDebouncedValue] = useState<string>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if the value changes before the delay finishes
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
