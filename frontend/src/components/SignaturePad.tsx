import { useRef, useEffect, useState } from "react";
import SignaturePadLib from "signature_pad";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
}

export default function SignaturePad({ onSave, onClear, width = 500, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
    }
    sigPadRef.current = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    });
    return () => {
      sigPadRef.current?.off();
    };
  }, [width, height]);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleSave = () => {
    if (sigPadRef.current?.isEmpty()) return;
    const dataUrl = sigPadRef.current?.toDataURL("image/png");
    if (dataUrl) {
      onSave(dataUrl);
      setIsEmpty(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair w-full"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
        >
          Limpar
        </button>
        <button
          onClick={handleSave}
          disabled={isEmpty}
          className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-dark transition disabled:opacity-50"
        >
          Confirmar Assinatura
        </button>
      </div>
    </div>
  );
}
