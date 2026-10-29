export const formatApiErrorMessage = (error: any, fallback = 'Operation failed'): string => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const resData = error.response?.data;
  if (resData) {
    if (typeof resData.message === 'string' && resData.message.trim()) {
      return resData.message.trim();
    }
    if (Array.isArray(resData.message) && resData.message.length > 0) {
      return resData.message
        .map((m: any) => (typeof m === 'string' ? m.trim() : JSON.stringify(m)))
        .filter(Boolean)
        .join('\n');
    }
    if (typeof resData.error === 'string' && resData.error.trim()) {
      return resData.error.trim();
    }
    if (typeof resData === 'string' && resData.trim()) {
      return resData.trim();
    }
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
};
