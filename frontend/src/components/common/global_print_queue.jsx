import React, { useEffect, useMemo, useRef, useState } from "react";
import { BsChevronUp, BsDashLg, BsPrinter } from "react-icons/bs";
import requestService from "../../services/requestService";
import {
  getDefaultPrintQueueState,
  readPrintQueueState,
  subscribeToPrintQueue,
} from "../../utils/printQueue";
import { filterCertifyEligibleRequests } from "../../utils/certifyRequestGuard";

const MINIMIZED_STORAGE_KEY = "certify.printQueue.minimized";
const POSITION_STORAGE_KEY = "certify.printQueue.position";
const SCREEN_PADDING = 8;
const DEFAULT_SCREEN_OFFSET = 16;

const readStoredPosition = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.x !== "number" ||
      Number.isNaN(parsed.x) ||
      typeof parsed?.y !== "number" ||
      Number.isNaN(parsed.y)
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to read print queue position:", error);
    return null;
  }
};

const clampPosition = (position, element) => {
  if (!position) return null;

  const width = element?.offsetWidth ?? 0;
  const height = element?.offsetHeight ?? 0;
  const maxX = Math.max(
    SCREEN_PADDING,
    window.innerWidth - width - SCREEN_PADDING,
  );
  const maxY = Math.max(
    SCREEN_PADDING,
    window.innerHeight - height - SCREEN_PADDING,
  );

  return {
    x: Math.min(Math.max(position.x, SCREEN_PADDING), maxX),
    y: Math.min(Math.max(position.y, SCREEN_PADDING), maxY),
  };
};

const GlobalPrintQueue = () => {
  const queueRef = useRef(null);
  const dragRef = useRef(null);
  const [printQueue, setPrintQueue] = useState(getDefaultPrintQueueState);
  const [queueStats, setQueueStats] = useState({
    queuedCount: 0,
    printedCount: 0,
    totalVisible: 0,
  });
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MINIMIZED_STORAGE_KEY) === "true";
  });
  const [position, setPosition] = useState(readStoredPosition);

  useEffect(() => {
    setPrintQueue(readPrintQueueState());
    return subscribeToPrintQueue(setPrintQueue);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MINIMIZED_STORAGE_KEY, String(minimized));
  }, [minimized]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!position) {
      window.localStorage.removeItem(POSITION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setPosition((current) => {
        if (!current) return current;
        return clampPosition(current, queueRef.current);
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePointerMove = (event) => {
      const dragState = dragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      setPosition(
        clampPosition(
          {
            x: event.clientX - dragState.offsetX,
            y: event.clientY - dragState.offsetY,
          },
          queueRef.current,
        ),
      );
    };

    const handlePointerUp = (event) => {
      const dragState = dragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchQueueStats = async () => {
      try {
        const data = await requestService.getAllRequests({
          page: 1,
          limit: 100,
        });
        if (!mounted) return;

        const all = filterCertifyEligibleRequests(
          Array.isArray(data) ? data : data.items || [],
        );
        const releasable = all.filter(
          (request) => request.status === "FOR_RELEASING",
        );
        const printedCount = releasable.filter(
          (request) => request.auto_printed_at,
        ).length;

        setQueueStats({
          queuedCount: Math.max(releasable.length - printedCount, 0),
          printedCount,
          totalVisible: releasable.length,
        });
      } catch (error) {
        console.error("Failed to load print queue stats:", error);
      }
    };

    fetchQueueStats();
    const intervalId = window.setInterval(fetchQueueStats, 5000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const { active, status, processed, total, failed, lastPrintedAt } =
    printQueue;
  const isDone = status === "done";
  const isError = status === "error";
  const isQueueClear =
    !active && !isDone && !isError && queueStats.queuedCount === 0;

  const percent = useMemo(() => {
    if (active || isDone || isError) {
      if (total <= 0) return 0;
      return Math.min(Math.round((processed / total) * 100), 100);
    }

    if (queueStats.totalVisible === 0) return 100;
    return Math.round(
      (queueStats.printedCount / queueStats.totalVisible) * 100,
    );
  }, [
    active,
    isDone,
    isError,
    processed,
    total,
    queueStats.printedCount,
    queueStats.totalVisible,
  ]);

  const handleDragStart = (event) => {
    if (event.button !== 0) return;

    const queueElement = queueRef.current;
    if (!queueElement) return;

    const rect = queueElement.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    setPosition(
      clampPosition(
        {
          x: rect.left,
          y: rect.top,
        },
        queueElement,
      ),
    );

    event.preventDefault();
  };

  let title = "Print queue";
  let detail = `${queueStats.queuedCount} waiting in queue`;
  let detailTone = "text-gray-500";
  let statusCaption = "Waiting for print job";
  let badgeValue = `${queueStats.queuedCount}`;

  if (active) {
    title =
      status === "printing" ? "Print dialog open" : "Preparing print batch";
    detail =
      status === "printing"
        ? "Waiting for the browser print flow to finish."
        : `${processed} of ${total} certificates prepared`;
    detailTone = "text-[#ee1133]";
    statusCaption =
      status === "printing" ? "Print job in browser" : "Preparing documents";
    badgeValue = status === "printing" ? "Live" : `${processed}/${total}`;
  } else if (isDone) {
    title = "Print batch completed";
    detail =
      failed > 0
        ? `${processed} prepared, ${failed} failed`
        : `${processed} certificates prepared for printing`;
    detailTone = "text-green-600";
    statusCaption = "Last batch completed";
    badgeValue = "Done";
  } else if (isError) {
    title = "Print batch interrupted";
    detail = "The print batch could not be prepared.";
    detailTone = "text-red-600";
    statusCaption = "Needs retry";
    badgeValue = "Error";
  } else if (isQueueClear) {
    title = "Queue is clear";
    detail = "All releasable certificates are already printed.";
    detailTone = "text-green-600";
    statusCaption = "No pending print jobs";
    badgeValue = "Clear";
  }

  const floatingStyle = position
    ? {
        left: position.x,
        top: position.y,
        right: "auto",
        bottom: "auto",
      }
    : {
        right: DEFAULT_SCREEN_OFFSET,
        bottom: DEFAULT_SCREEN_OFFSET,
      };

  return (
    <div
      ref={queueRef}
      className="fixed z-40 w-[min(22rem,calc(100vw-1.5rem))]"
      style={floatingStyle}
      data-testid="global-print-queue"
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur">
        <div
          onPointerDown={handleDragStart}
          className="flex w-full cursor-move items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/80"
          style={{ touchAction: "none" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff1f3] text-[#ee1133]">
              <BsPrinter size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                Print Job Status
              </div>
              <div className="truncate text-sm font-semibold text-gray-800">
                {title}
              </div>
              <div className="truncate text-xs text-gray-500">
                {statusCaption}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
              {badgeValue}
            </span>
            <button
              type="button"
              aria-label={
                minimized ? "Expand printing queue" : "Minimize printing queue"
              }
              onClick={() => setMinimized((prev) => !prev)}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              {minimized ? (
                <BsChevronUp size={14} className="text-inherit" />
              ) : (
                <BsDashLg size={14} className="text-inherit" />
              )}
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-1">
            <p className={`text-xs ${detailTone}`}>{detail}</p>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-gray-50 px-2 py-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-400">
                  Pending
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-800">
                  {queueStats.queuedCount}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 px-2 py-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-400">
                  Printed
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-800">
                  {queueStats.printedCount}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 px-2 py-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-400">
                  Latest Batch
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-800">
                  {active || isDone || isError
                    ? `${processed}/${total}`
                    : queueStats.totalVisible || "--"}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
              <span>
                {failed > 0 ? `${failed} failed in latest batch` : ""}
              </span>
              <span>
                {lastPrintedAt ? `Updated ${lastPrintedAt}` : statusCaption}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalPrintQueue;
