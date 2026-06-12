import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ASSETS_CONFIG } from "../config/assets.config";

interface LoadingOverlayProps {
  runtimeReady: boolean;
  runtimeError: string | null;
  loadingProgress: number;
  onComplete: () => void;
}

type LoadingPhase = "mithools" | "brand" | "leaving" | "complete";

const MITHOOLS_MS = 2200;
const BRAND_MIN_MS = 1250;
const FADE_OUT_MS = 520;
const LOADING_BAR_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7, 10, 11] as const;
const LOADING_BAR_FRAME_COUNT = LOADING_BAR_FRAMES.length;

function getDeliveryLoadingAsset(path: string): string {
  return `${ASSETS_CONFIG.delivery.basePath}/loading/${path}`;
}

function getLoadingBarLabel(frame: number): string {
  const safeFrame = Math.max(1, Math.min(LOADING_BAR_FRAME_COUNT, Math.round(frame)));
  return `${safeFrame}/${LOADING_BAR_FRAME_COUNT}`;
}

export function LoadingOverlay({
  runtimeReady,
  runtimeError,
  loadingProgress,
  onComplete,
}: LoadingOverlayProps) {
  const [phase, setPhase] = useState<LoadingPhase>("mithools");
  const [brandMinimumElapsed, setBrandMinimumElapsed] = useState(false);
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [loadingBarFrame, setLoadingBarFrame] = useState(1);
  const targetProgressRef = useRef(0);
  const targetFrameRef = useRef(1);
  const runtimeReadyRef = useRef(runtimeReady);

  useEffect(() => {
    if (phase !== "mithools") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setPhase("brand"), MITHOOLS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  useEffect(() => {
    if (phase !== "brand") {
      return undefined;
    }

    setBrandMinimumElapsed(false);
    setLoadingBarFrame(1);
    setDisplayedProgress(0);
    targetProgressRef.current = 0;
    targetFrameRef.current = 1;
    const timeoutId = window.setTimeout(() => setBrandMinimumElapsed(true), BRAND_MIN_MS);
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  useEffect(() => {
    const target = runtimeReady ? 100 : Math.min(99, Math.max(0, loadingProgress));
    runtimeReadyRef.current = runtimeReady;
    targetProgressRef.current = Math.max(targetProgressRef.current, target);
    targetFrameRef.current = runtimeReady
      ? LOADING_BAR_FRAME_COUNT
      : Math.min(
          LOADING_BAR_FRAME_COUNT - 1,
          Math.max(1, Math.ceil((target / 100) * LOADING_BAR_FRAME_COUNT)),
        );
  }, [loadingProgress, runtimeReady]);

  useEffect(() => {
    if (phase !== "brand") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setDisplayedProgress((current) => {
        const target = targetProgressRef.current;
        if (current >= target) {
          return current;
        }
        const step = runtimeReadyRef.current ? 12 : 5;
        return Math.min(target, current + step);
      });
      setLoadingBarFrame((current) =>
        current >= targetFrameRef.current ? current : Math.min(targetFrameRef.current, current + 1),
      );
    }, 140);

    return () => window.clearInterval(intervalId);
  }, [phase]);

  useEffect(() => {
    if (
      phase !== "brand" ||
      !brandMinimumElapsed ||
      !runtimeReady ||
      displayedProgress < 100 ||
      loadingBarFrame < LOADING_BAR_FRAME_COUNT ||
      runtimeError
    ) {
      return undefined;
    }

    setPhase("leaving");
    return undefined;
  }, [brandMinimumElapsed, displayedProgress, loadingBarFrame, phase, runtimeError, runtimeReady]);

  useEffect(() => {
    if (phase !== "leaving") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPhase("complete");
      onComplete();
    }, FADE_OUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onComplete, phase]);

  const barLabel = useMemo(() => getLoadingBarLabel(loadingBarFrame), [loadingBarFrame]);
  const loadingBarImage = useMemo(() => {
    const sourceFrame = LOADING_BAR_FRAMES[loadingBarFrame - 1] ?? LOADING_BAR_FRAMES[0];
    return getDeliveryLoadingAsset(`loading_bar_${String(sourceFrame).padStart(4, "0")}.webp`);
  }, [loadingBarFrame]);
  const overlayStyle = {
    "--game-loading-progress": `${Math.round(displayedProgress)}%`,
  } as CSSProperties;

  if (phase === "complete") {
    return null;
  }

  return (
    <aside
      aria-busy={!runtimeReady}
      aria-label="Cargando Delivery"
      className={`game-loading-overlay game-loading-overlay--${phase}`}
      style={overlayStyle}
    >
      <div className="game-loading__mithools" aria-hidden={phase !== "mithools"}>
        <span>Delivery</span>
      </div>
      <div className="game-loading__brand" aria-hidden={phase === "mithools"}>
        <img
          alt=""
          className="game-loading__background-img"
          draggable={false}
          src={getDeliveryLoadingAsset("background_loading.webp")}
        />
        <img
          alt=""
          className="game-loading__brand-logo-img"
          draggable={false}
          src={getDeliveryLoadingAsset("titular.webp")}
        />
        <div className="game-loading__brand-mark" aria-hidden="true">
          <img
            alt=""
            className="game-loading__rider-img"
            draggable={false}
            src={getDeliveryLoadingAsset("moterito.webp")}
          />
          <img
            alt=""
            className="game-loading__pin-img"
            draggable={false}
            src={getDeliveryLoadingAsset("pin_gps.webp")}
          />
        </div>
        <div
          aria-label={`Carga ${barLabel}`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(displayedProgress)}
          className="game-loading__bar"
          role="progressbar"
        >
          <img alt="" draggable={false} src={loadingBarImage} />
          <span />
        </div>
        {runtimeError ? <p className="game-loading__error">{runtimeError}</p> : null}
      </div>
    </aside>
  );
}
