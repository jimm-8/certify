import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
} from "react";

const OdrSignaturePad = React.forwardRef(({ onSignatureChange }, ref) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Get the device pixel ratio
    const dpr = window.devicePixelRatio || 1;

    // Get CSS size
    const rect = canvas.getBoundingClientRect();

    // Set canvas internal size (scaled by device pixel ratio)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Set drawing style
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const source =
      event.touches?.[0] ||
      event.changedTouches?.[0] ||
      event;

    if (
      typeof source?.clientX !== "number" ||
      typeof source?.clientY !== "number"
    ) {
      return null;
    }

    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  };

  const emitSignature = () => {
    if (onSignatureChange && canvasRef.current) {
      onSignatureChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const startDrawing = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getPoint(event);
    if (!point) return;

    event.preventDefault?.();
    isDrawingRef.current = true;
    setHasSignature(true);

    if (typeof event.pointerId === "number" && canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    emitSignature();
  };

  const draw = (event) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getPoint(event);
    if (!point) return;

    event.preventDefault?.();
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    emitSignature();
  };

  const stopDrawing = (event) => {
    if (!isDrawingRef.current) return;
    event?.preventDefault?.();
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (
      canvas &&
      typeof event?.pointerId === "number" &&
      canvas.releasePointerCapture
    ) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isDrawingRef.current = false;
    setHasSignature(false);
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  };

  const getSignatureData = () => {
    if (!hasSignature) return null;
    return canvasRef.current.toDataURL("image/png");
  };

  React.useImperativeHandle(
    ref,
    () => ({
      getSignatureData,
      clear: handleClear,
    }),
    [hasSignature]
  );

  return (
    <div className="flex mt-3 flex-col items-center">
      <div className="border-2 w-1/2 border-gray-300 p-4 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="w-full h-48 cursor-crosshair bg-white"
          style={{
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
        />
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleClear}
          className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasSignature}
        >
          Clear
        </button>
      </div>
    </div>
  );
});

export default OdrSignaturePad;
