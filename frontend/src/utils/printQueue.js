const PRINT_QUEUE_STORAGE_KEY = "certify.printQueue";
const PRINT_QUEUE_EVENT = "certify:print-queue-updated";

const defaultPrintQueueState = {
  active: false,
  status: "idle",
  processed: 0,
  total: 0,
  failed: 0,
  lastPrintedAt: null,
};

export const getDefaultPrintQueueState = () => ({ ...defaultPrintQueueState });

export const readPrintQueueState = () => {
  if (typeof window === "undefined") return getDefaultPrintQueueState();

  try {
    const raw = window.localStorage.getItem(PRINT_QUEUE_STORAGE_KEY);
    if (!raw) return getDefaultPrintQueueState();
    return { ...defaultPrintQueueState, ...JSON.parse(raw) };
  } catch (error) {
    console.error("Failed to read print queue state:", error);
    return getDefaultPrintQueueState();
  }
};

export const writePrintQueueState = (state) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PRINT_QUEUE_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent(PRINT_QUEUE_EVENT, {
        detail: state,
      }),
    );
  } catch (error) {
    console.error("Failed to write print queue state:", error);
  }
};

export const subscribeToPrintQueue = (callback) => {
  if (typeof window === "undefined") return () => {};

  const handleEvent = (event) => {
    callback(event.detail || readPrintQueueState());
  };

  const handleStorage = (event) => {
    if (event.key !== PRINT_QUEUE_STORAGE_KEY) return;
    callback(readPrintQueueState());
  };

  window.addEventListener(PRINT_QUEUE_EVENT, handleEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PRINT_QUEUE_EVENT, handleEvent);
    window.removeEventListener("storage", handleStorage);
  };
};
