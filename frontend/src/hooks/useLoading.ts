import { useState, useCallback } from 'react';

interface UseLoadingReturn<T> {
  isLoading: boolean;
  error: Error | null;
  run: (asyncFn: () => Promise<T>) => Promise<T | undefined>;
}

export const useLoading = <T = unknown>(): UseLoadingReturn<T> => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async (asyncFn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      return result;
    } catch (err) {
      const errorObject = err instanceof Error ? err : new Error(String(err));
      setError(errorObject);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, run };
};