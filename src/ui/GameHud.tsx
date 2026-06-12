import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAYOUT_CONFIG } from "../config/layout.config";
import type { PixiGame } from "../engine/PixiGame";
import { useAudioStore } from "../store/audioStore";
import { useGameStore } from "../store/gameStore";
import type { DebugFeatureMode, DebugWinMode } from "../types/game.types";
import { formatMoney } from "../utils/format";
import {
  BetControlRow,
  HudModal,
  HudSwitch,
  ModalIcon,
  ReferenceFooter,
  SymbolPreview,
} from "./GameHud.components";
import {
  formatLocalTime,
  isLikelyMobileInput,
  useDesignLayerStyle,
  useFpsCounter,
  useSymbolPreviewFrames,
  wait,
} from "./GameHud.hooks";
import {
  AUTOPLAY_COUNTS,
  AUTOPLAY_DELAY_BY_SPIN_MODE,
  type AutoplayConfig,
  BET_LEVELS,
  COIN_VALUE_OPTIONS,
  clampOptionIndex,
  DEBUG_FEATURE_OPTIONS,
  DEBUG_WIN_OPTIONS,
  getBetLevelIndex,
  HUD_INTERACTION_SOUND,
  type ModalKind,
  RAW_ICON_PATHS,
  RULE_EXPLAINERS,
  rectStyle,
  type SpinMode,
} from "./GameHud.shared";
import { buildPaytableItems, PAYLINE_COUNT } from "./paytable";

interface GameHudProps {
  runtime: PixiGame | null;
}

export function GameHud({ runtime: _runtime }: GameHudProps) {
  const runtime = _runtime;
  const {
    balance,
    bet,
    roundNumber,
    status,
    spinBusy,
    debugFeatureModes,
    debugWinModes,
    setBet,
    setDebugFeatureMode,
    setDebugWinMode,
  } = useGameStore();
  const { musicMuted, sfxMuted, volume, setMusicMuted, setSfxMuted, setVolume } = useAudioStore();
  const containerRef = useRef<HTMLElement | null>(null);
  const fullscreenAttemptedRef = useRef(false);
  const autoplayCancelRef = useRef(false);
  const spinModeRef = useRef<SpinMode>(1);
  const previousSpinMotionActiveRef = useRef(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [localTime, setLocalTime] = useState(() => formatLocalTime());
  const [fpsVisible, setFpsVisible] = useState(false);
  const [spinMode, setSpinMode] = useState<SpinMode>(1);
  const [spinSettling, setSpinSettling] = useState(false);
  const [coinValueIndex, setCoinValueIndex] = useState(0);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const designLayerStyle = useDesignLayerStyle(containerRef, animationsEnabled);
  const [autoplayConfig, setAutoplayConfig] = useState<AutoplayConfig>({
    count: 10,
    untilWin: false,
    fullAuto: false,
  });
  const [autoplayRunning, setAutoplayRunning] = useState(false);
  const [autoplayCompletedSpins, setAutoplayCompletedSpins] = useState(0);
  const spinMotionActive = status === "spinning" || status === "stopping";
  const coinValue = Number(COIN_VALUE_OPTIONS[coinValueIndex]);
  const autoplayTotalSpins = autoplayConfig.fullAuto ? null : autoplayConfig.count;
  const fps = useFpsCounter(fpsVisible);
  const paytableItems = useMemo(() => buildPaytableItems(), []);
  const previewFrames = useSymbolPreviewFrames(paytableItems);

  useEffect(() => {
    const timer = window.setInterval(() => setLocalTime(formatLocalTime()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    spinModeRef.current = spinMode;
    runtime?.setSpinMode(spinMode);
  }, [runtime, spinMode]);

  useEffect(() => {
    runtime?.setVibrationEnabled(vibrationEnabled);
  }, [runtime, vibrationEnabled]);

  useEffect(() => {
    runtime?.setAnimationsEnabled(animationsEnabled);
    runtime?.setVisualEffectsEnabled(animationsEnabled);
    const shell = containerRef.current?.closest(".slot-shell");
    shell?.classList.toggle("is-animations-disabled", !animationsEnabled);
    return () => {
      shell?.classList.remove("is-animations-disabled");
    };
  }, [animationsEnabled, runtime]);

  useEffect(() => {
    if (spinMotionActive) {
      previousSpinMotionActiveRef.current = true;
      setSpinSettling(false);
      return undefined;
    }

    if (!previousSpinMotionActiveRef.current) {
      return undefined;
    }

    previousSpinMotionActiveRef.current = false;
    setSpinSettling(true);
    const timer = window.setTimeout(() => setSpinSettling(false), 360);
    return () => window.clearTimeout(timer);
  }, [spinMotionActive]);

  useEffect(
    () => () => {
      autoplayCancelRef.current = true;
    },
    [],
  );

  const requestMobileFullscreen = useCallback(() => {
    if (fullscreenAttemptedRef.current || !isLikelyMobileInput()) {
      return;
    }
    fullscreenAttemptedRef.current = true;
    if (document.fullscreenElement) {
      return;
    }
    const fullscreenTarget =
      containerRef.current?.closest(".slot-shell") ?? document.documentElement;
    const request = fullscreenTarget.requestFullscreen?.();
    if (request?.catch) {
      void request.catch(() => undefined);
    }
  }, []);

  const playUiInteractionSound = useCallback(
    function playUiInteractionSound() {
      runtime?.playSoundEvent(HUD_INTERACTION_SOUND);
    },
    [runtime],
  );

  const openModal = useCallback(
    (modal: Exclude<ModalKind, null>) => {
      playUiInteractionSound();
      setActiveModal(modal);
    },
    [playUiInteractionSound],
  );

  const closeModal = useCallback(() => {
    playUiInteractionSound();
    setActiveModal(null);
  }, [playUiInteractionSound]);

  const stopAutoplay = useCallback(() => {
    playUiInteractionSound();
    autoplayCancelRef.current = true;
  }, [playUiInteractionSound]);

  const startAutoplay = useCallback(async () => {
    if (!runtime || autoplayRunning || spinBusy) {
      return;
    }

    setActiveModal(null);
    requestMobileFullscreen();
    playUiInteractionSound();
    autoplayCancelRef.current = false;
    setAutoplayRunning(true);
    setAutoplayCompletedSpins(0);

    let remaining = autoplayConfig.fullAuto ? Number.POSITIVE_INFINITY : autoplayConfig.count;
    let completedSpins = 0;
    try {
      while (!autoplayCancelRef.current && remaining > 0) {
        await runtime.spin();
        completedSpins += 1;
        setAutoplayCompletedSpins(completedSpins);
        const state = useGameStore.getState();
        if (state.status === "error" || state.balance < state.bet) {
          break;
        }
        if (autoplayConfig.untilWin && state.lastWin > 0) {
          break;
        }
        if (!autoplayConfig.fullAuto) {
          remaining -= 1;
        }
        if (!autoplayConfig.fullAuto && remaining <= 0) {
          break;
        }
        await wait(AUTOPLAY_DELAY_BY_SPIN_MODE[spinModeRef.current]);
      }
    } finally {
      autoplayCancelRef.current = false;
      setAutoplayRunning(false);
    }
  }, [
    autoplayConfig,
    autoplayRunning,
    playUiInteractionSound,
    requestMobileFullscreen,
    runtime,
    spinBusy,
  ]);

  const handleAudioVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    runtime?.setAudioVolume(nextVolume);
  };

  const handleMusicToggle = (enabled: boolean) => {
    playUiInteractionSound();
    const nextMuted = !enabled;
    setMusicMuted(nextMuted);
    runtime?.setAudioMuted("music", nextMuted);
  };

  const handleSfxToggle = (enabled: boolean) => {
    playUiInteractionSound();
    const nextMuted = !enabled;
    setSfxMuted(nextMuted);
    runtime?.setAudioMuted("sfx", nextMuted);
  };

  const handleVibrationToggle = (enabled: boolean) => {
    playUiInteractionSound();
    setVibrationEnabled(enabled);
    if (enabled) {
      navigator.vibrate?.(12);
    }
  };

  const handleAnimationsToggle = (enabled: boolean) => {
    playUiInteractionSound();
    setAnimationsEnabled(enabled);
  };

  const handleDebugWinToggle = (mode: DebugWinMode, enabled: boolean) => {
    setDebugWinMode(mode, enabled);
    playUiInteractionSound();
  };

  const handleDebugFeatureToggle = (mode: DebugFeatureMode, enabled: boolean) => {
    setDebugFeatureMode(mode, enabled);
    playUiInteractionSound();
  };

  const adjustBetLevel = (direction: -1 | 1) => {
    playUiInteractionSound();
    const currentIndex = getBetLevelIndex(bet);
    const nextIndex = clampOptionIndex(currentIndex + direction, BET_LEVELS.length);
    setBet(Number(BET_LEVELS[nextIndex]));
  };

  const setMaxBet = () => {
    playUiInteractionSound();
    setBet(Number(BET_LEVELS[BET_LEVELS.length - 1]));
  };

  const adjustCoinValue = (direction: -1 | 1) => {
    playUiInteractionSound();
    setCoinValueIndex((current) =>
      clampOptionIndex(current + direction, COIN_VALUE_OPTIONS.length),
    );
  };

  const cycleSpinMode = () => {
    const nextSpinMode = spinMode === 3 ? 1 : ((spinMode + 1) as SpinMode);
    setSpinMode(nextSpinMode);
    playUiInteractionSound();
  };

  return (
    <section ref={containerRef} className="game-hud" aria-label="Layout visual de El Gallero">
      <div className="game-hud__design-layer" style={designLayerStyle}>
        <ReferenceFooter
          autoplayCompletedSpins={autoplayCompletedSpins}
          autoplayRunning={autoplayRunning}
          autoplayTotalSpins={autoplayTotalSpins}
          balance={balance}
          bet={bet}
          disabled={!runtime}
          spinBusy={spinBusy}
          spinMode={spinMode}
          spinMotionActive={spinMotionActive}
          spinSettling={spinSettling}
          roundNumber={roundNumber}
          onAutoplay={() => {
            openModal("autoplay");
          }}
          onBetDecrease={() => {
            playUiInteractionSound();
            runtime?.decreaseBet();
          }}
          onBetIncrease={() => {
            playUiInteractionSound();
            runtime?.increaseBet();
          }}
          onBetSelector={() => {
            openModal("bet");
          }}
          onInfo={() => {
            openModal("info");
          }}
          onMenu={() => {
            openModal("menu");
          }}
          onSpin={() => {
            requestMobileFullscreen();
            playUiInteractionSound();
            void runtime?.spin();
          }}
          onStopAutoplay={stopAutoplay}
          onSpinMode={cycleSpinMode}
        />

        <div
          className="game-hud__local-time game-hud__time-stack"
          data-layout-target="hud-local-time"
          style={rectStyle(LAYOUT_CONFIG.v2Footer.localTime)}
        >
          <span>{localTime}</span>
          {fpsVisible ? <span className="game-hud__fps-counter">{fps} FPS</span> : null}
        </div>

        {activeModal === "menu" ? (
          <HudModal title="Menu" onClose={closeModal}>
            <div className="game-hud__menu-modal">
              <div className="game-hud__audio-panel">
                <label className="game-hud__volume-control">
                  <span className="game-hud__volume-header">
                    <span>Volumen</span>
                    <strong>{Math.round(volume * 100)}%</strong>
                  </span>
                  <input
                    className="game-hud__audio-slider"
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volume * 100)}
                    style={
                      { "--hud-volume-progress": `${Math.round(volume * 100)}%` } as CSSProperties
                    }
                    onChange={(event) => handleAudioVolume(Number(event.currentTarget.value) / 100)}
                  />
                </label>
                <HudSwitch label="Musica" checked={!musicMuted} onChange={handleMusicToggle} />
                <HudSwitch
                  label="Efectos de sonido"
                  checked={!sfxMuted}
                  onChange={handleSfxToggle}
                />
                <HudSwitch
                  label="Vibracion"
                  checked={vibrationEnabled}
                  onChange={handleVibrationToggle}
                />
              </div>
              <div className="game-hud__effects-panel">
                <HudSwitch
                  label="Animaciones"
                  checked={animationsEnabled}
                  onChange={handleAnimationsToggle}
                />
                <HudSwitch
                  label="FPS"
                  checked={fpsVisible}
                  onChange={(checked) => {
                    playUiInteractionSound();
                    setFpsVisible(checked);
                  }}
                />
              </div>
              <div className="game-hud__debug-panel">
                <strong className="game-hud__debug-title">Debug</strong>
                {DEBUG_WIN_OPTIONS.map(({ mode, label }) => (
                  <HudSwitch
                    key={mode}
                    label={label}
                    checked={debugWinModes[mode]}
                    onChange={(enabled) => handleDebugWinToggle(mode, enabled)}
                  />
                ))}
                {DEBUG_FEATURE_OPTIONS.map(({ mode, label }) => (
                  <HudSwitch
                    key={mode}
                    label={label}
                    checked={debugFeatureModes[mode]}
                    onChange={(enabled) => handleDebugFeatureToggle(mode, enabled)}
                  />
                ))}
              </div>
            </div>
          </HudModal>
        ) : null}

        {activeModal === "autoplay" ? (
          <HudModal title="Auto Spin" onClose={closeModal}>
            <div className="game-hud__autoplay-modal">
              <div className="game-hud__autoplay-summary">
                <span>
                  {autoplayConfig.fullAuto ? "FULL AUTO" : `${autoplayConfig.count} GIROS`}
                </span>
                <strong>Apuesta activa {formatMoney(bet)}</strong>
              </div>
              <div
                className={[
                  "game-hud__autoplay-count-grid",
                  autoplayConfig.fullAuto ? "is-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {AUTOPLAY_COUNTS.map((count) => (
                  <button
                    key={count}
                    className={[
                      "game-hud__modal-control-button",
                      "game-hud__autoplay-count-button",
                      autoplayConfig.count === count && !autoplayConfig.fullAuto
                        ? "is-selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="button"
                    aria-pressed={autoplayConfig.count === count && !autoplayConfig.fullAuto}
                    onClick={() => {
                      playUiInteractionSound();
                      setAutoplayConfig((current) => ({
                        ...current,
                        count,
                        fullAuto: false,
                      }));
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <HudSwitch
                label="Hasta que gane"
                checked={autoplayConfig.untilWin}
                onChange={(checked) => {
                  playUiInteractionSound();
                  setAutoplayConfig((current) => ({
                    ...current,
                    untilWin: checked,
                  }));
                }}
              />
              <HudSwitch
                label="Full auto spin"
                checked={autoplayConfig.fullAuto}
                onChange={(checked) => {
                  playUiInteractionSound();
                  setAutoplayConfig((current) => ({
                    ...current,
                    fullAuto: checked,
                  }));
                }}
              />
              <button
                className="game-hud__modal-action-button"
                type="button"
                disabled={!runtime || (!autoplayRunning && spinBusy)}
                onClick={autoplayRunning ? stopAutoplay : startAutoplay}
              >
                <ModalIcon
                  className="game-hud__autoplay-action-icon"
                  iconSrc={autoplayRunning ? RAW_ICON_PATHS.stop : RAW_ICON_PATHS.autospin}
                />
                <span>{autoplayRunning ? "DETENER" : "INICIAR"}</span>
              </button>
            </div>
          </HudModal>
        ) : null}

        {activeModal === "bet" ? (
          <HudModal title="Apuesta" onClose={closeModal}>
            <div className="game-hud__bet-modal">
              <BetControlRow
                label="Apuesta"
                value={formatMoney(bet)}
                onDecrease={() => adjustBetLevel(-1)}
                onIncrease={() => adjustBetLevel(1)}
              />
              <BetControlRow
                label="Valor Moneda"
                value={formatMoney(coinValue)}
                onDecrease={() => adjustCoinValue(-1)}
                onIncrease={() => adjustCoinValue(1)}
              />
              <BetControlRow
                label="Apuesta Total"
                value={formatMoney(bet)}
                onDecrease={() => adjustBetLevel(-1)}
                onIncrease={() => adjustBetLevel(1)}
              />
              <button
                className="game-hud__modal-action-button game-hud__max-bet-button"
                type="button"
                onClick={setMaxBet}
              >
                <ModalIcon className="game-hud__max-bet-icon" iconSrc={RAW_ICON_PATHS.coin} />
                <span>APUESTA MAXIMA</span>
              </button>
            </div>
          </HudModal>
        ) : null}

        {activeModal === "info" ? (
          <HudModal title={`Premios - ${PAYLINE_COUNT} lineas`} onClose={closeModal}>
            <div className="game-hud__info-panel">
              <section className="game-hud__rules-grid" aria-label="Reglas principales">
                {RULE_EXPLAINERS.map((rule) => (
                  <article className="game-hud__rule-row" key={rule.title}>
                    <span className="game-hud__rule-icon">
                      <ModalIcon iconSrc={rule.iconSrc} />
                    </span>
                    <span className="game-hud__rule-copy">
                      <strong>{rule.title}</strong>
                      <p>{rule.text}</p>
                    </span>
                  </article>
                ))}
              </section>
              <div className="game-hud__paytable">
                {paytableItems.map((item) => (
                  <div className="game-hud__paytable-row" key={item.id}>
                    <SymbolPreview frame={previewFrames[item.id]} item={item} />
                    <strong>{item.label}</strong>
                    <span>3x {item.payouts[3] ?? "-"}</span>
                    <span>4x {item.payouts[4] ?? "-"}</span>
                    <span>5x {item.payouts[5] ?? "-"}</span>
                    {item.featureText ? <em>{item.featureText}</em> : null}
                  </div>
                ))}
              </div>
            </div>
          </HudModal>
        ) : null}
      </div>
    </section>
  );
}
