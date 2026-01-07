// Utility functions for consistent date handling

type DateInput = string | Date | number | null | undefined;

export const formatDate = (date: DateInput, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return 'No date';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric', // Always 4-digit year
    month: 'short',
    day: 'numeric'
  };
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

export const formatDateTime = (date: DateInput): string => {
  return formatDate(date, {
    year: 'numeric', // Always 4-digit year
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateLong = (date: DateInput): string => {
  return formatDate(date, {
    weekday: 'long',
    year: 'numeric', // Always 4-digit year
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeUntilDate = (targetDate: DateInput): string => {
  if (!targetDate) return 'No date';
  
  const target = new Date(targetDate);
  if (isNaN(target.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else {
    return `${diffDays} days remaining`;
  }
};

export const isValidDate = (date: DateInput): boolean => {
  if (!date) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

export const getMinDateTime = (): string => {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  return now.toISOString().slice(0, 16);
};

export const formatDateISO = (date: DateInput): string => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toISOString().split('T')[0];
};
