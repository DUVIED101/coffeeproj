export const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const first = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const last = lastName?.trim().charAt(0).toUpperCase() ?? '';
  const result = `${first}${last}`;
  return result.length > 0 ? result : '?';
};
