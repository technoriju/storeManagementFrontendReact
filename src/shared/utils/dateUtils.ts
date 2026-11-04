/**
 * Returns YYYY-MM-DD in the user's LOCAL timezone.
 * Prevents UTC-shift bug where new Date().toISOString().split('T')[0]
 * returns yesterday's date after midnight (e.g. 00:00 - 05:30 in IST).
 */
export const getLocalDateString = (d?: Date | string | null): string => {
  if (!d) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof d === 'string') {
    const trimmed = d.trim();
    // If it's already plain YYYY-MM-DD without time/timezone, keep it
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const dateObj = new Date(trimmed);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  const dateObj = d;
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
