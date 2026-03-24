export const getNow = (): number => {
  return Date.now();
};

export const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

export const isOverdue = (dueDate: number | null): boolean => {
  if (dueDate === null) {
    return false;
  }
  return dueDate < Date.now();
};
