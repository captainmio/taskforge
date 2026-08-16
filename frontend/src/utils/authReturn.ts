export const getSafeReturnTo = (value: string | null): string | null => {
  if (!value) return null;

  try {
    const appOrigin = new URL("http://app.local");
    const destination = new URL(value, appOrigin);

    if (destination.origin !== appOrigin.origin) return null;

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
};
