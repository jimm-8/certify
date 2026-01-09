import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

const OdrSignaturePad = React.forwardRef(({ onSignatureChange }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
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

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    setIsDrawing(true);
    setHasSignature(true);

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    if (onSignatureChange) {
      const signatureData = canvasRef.current.toDataURL("image/png");
      onSignatureChange(signatureData);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    }),
    [hasSignature]
  );

  return (
    <div className="flex mt-3 flex-col items-center">
      <div className="border-2 w-1/2 border-gray-300 p-4 bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-48 cursor-crosshair bg-white"
          style={{ touchAction: "none" }}
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
