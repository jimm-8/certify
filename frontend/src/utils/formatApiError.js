const formatApiError = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  const payload = error?.response?.data;
  const detail = payload?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.msg === "string") return item.msg;
        return null;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export default formatApiError;
