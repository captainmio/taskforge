import { useState, useEffect } from 'react';

interface debounce {
    value: string,
    delay?: number;
}

export function useDebounce(props: debounce) {
    const { value, delay = 0 } = props
    const [debouncedValue, setDebouncedValue] = useState(value);

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
