import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className = "" }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#1e3a5f", // Primary blue
          light: "#ffffff",
        },
      });
    }
  }, [value, size]);

  return <canvas ref={canvasRef} className={className} />;
}

export function QRCodeDataURL({ value, size = 200 }: { value: string; size?: number }): Promise<string> {
  return QRCodeLib.toDataURL(value, {
    width: size,
    margin: 2,
    color: {
      dark: "#1e3a5f",
      light: "#ffffff",
    },
  });
}
