type AllowedValuesMap = Record<string, string>;

// Returns a typed value only when the input exists in the supplied value map.
export const parseAllowedValue = <TValues extends AllowedValuesMap>(
  allowedValues: TValues,
  value: string
): TValues[keyof TValues] | undefined => {
  const values = Object.values(allowedValues) as Array<TValues[keyof TValues]>;
  return values.includes(value as TValues[keyof TValues])
    ? (value as TValues[keyof TValues])
    : undefined;
};
