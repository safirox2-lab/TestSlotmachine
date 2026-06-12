import { useEffect, useRef } from "react";
import { PixiGame } from "../engine/PixiGame";

interface GameCanvasProps {
  setRuntimeReady: (runtime: PixiGame | null) => void;
  onRuntimeError: (message: string) => void;
}

export function GameCanvas({ setRuntimeReady, onRuntimeError }: GameCanvasProps) {
  const hostRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvasHost = hostRef.current;

    if (!canvasHost) {
      return undefined;
    }

    let disposed = false;
    const runtime = new PixiGame(canvasHost);

    runtime
      .mount()
      .then(() => {
        if (disposed) {
          runtime.destroy();
          return;
        }

        setRuntimeReady(runtime);
      })
      .catch((error: unknown) => {
        console.error("No se pudo montar el runtime Pixi.", error);
        const message =
          error instanceof Error ? error.message : "No se pudo montar el runtime Pixi.";
        onRuntimeError(message);
      });

    return () => {
      disposed = true;
      setRuntimeReady(null);
      runtime.destroy();
    };
  }, [onRuntimeError, setRuntimeReady]);

  return <main className="slot-canvas-host" ref={hostRef} />;
}
