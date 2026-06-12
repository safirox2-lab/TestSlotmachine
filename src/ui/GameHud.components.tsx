import type { CSSProperties, ReactNode } from "react";
import { LAYOUT_CONFIG } from "../config/layout.config";
import { formatMoney } from "../utils/format";
import {
  type AtlasPreviewFrame,
  formatAutoplayCounter,
  formatRoundNumber,
  RAW_ICON_PATHS,
  rectStyle,
  SPIN_MODES,
  type SpinMode,
} from "./GameHud.shared";
import type { PaytableItem } from "./paytable";

export function ReferenceFooter({
  autoplayCompletedSpins,
  autoplayRunning,
  autoplayTotalSpins,
  balance,
  bet,
  disabled,
  spinBusy,
  spinMode,
  spinMotionActive,
  spinSettling,
  roundNumber,
  onAutoplay,
  onBetDecrease,
  onBetIncrease,
  onBetSelector,
  onInfo,
  onMenu,
  onSpin,
  onSpinMode,
  onStopAutoplay,
}: {
  autoplayCompletedSpins: number;
  autoplayRunning: boolean;
  autoplayTotalSpins: number | null;
  balance: number;
  bet: number;
  disabled: boolean;
  spinBusy: boolean;
  spinMode: SpinMode;
  spinMotionActive: boolean;
  spinSettling: boolean;
  roundNumber: number;
  onAutoplay: () => void;
  onBetDecrease: () => void;
  onBetIncrease: () => void;
  onBetSelector: () => void;
  onInfo: () => void;
  onMenu: () => void;
  onSpin: () => void;
  onSpinMode: () => void;
  onStopAutoplay: () => void;
}) {
  const spinButtonClassName = [
    "game-hud__reference-button--spin",
    "game-hud__reference-spin",
    spinMotionActive && !autoplayRunning ? "is-spinning" : "",
    spinSettling && !autoplayRunning ? "is-spin-settling" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className="game-hud__reference-footer"
        style={rectStyle(LAYOUT_CONFIG.v2Footer.referenceFooter)}
      >
        {autoplayRunning || autoplayCompletedSpins > 0 ? (
          <div className="game-hud__autoplay-counter" aria-live="polite">
            {formatAutoplayCounter(autoplayCompletedSpins, autoplayTotalSpins)}
          </div>
        ) : null}

        <div className="game-hud__reference-main-row">
          <ReferenceButton
            ariaLabel="Disminuir apuesta"
            className="game-hud__reference-button--round"
            disabled={disabled || spinBusy || autoplayRunning}
            iconSrc={RAW_ICON_PATHS.minus}
            onClick={onBetDecrease}
          />
          <ReferenceButton
            ariaLabel={autoplayRunning ? "Detener autoplay" : "Girar"}
            className={spinButtonClassName}
            disabled={disabled || (!autoplayRunning && spinBusy)}
            iconSrc={autoplayRunning ? RAW_ICON_PATHS.stop : RAW_ICON_PATHS.spin}
            onClick={autoplayRunning ? onStopAutoplay : onSpin}
          />
          <ReferenceButton
            ariaLabel="Aumentar apuesta"
            className="game-hud__reference-button--round"
            disabled={disabled || spinBusy || autoplayRunning}
            iconSrc={RAW_ICON_PATHS.plus}
            onClick={onBetIncrease}
          />
        </div>

        <div className="game-hud__reference-secondary-row">
          <ReferenceButton
            ariaLabel="Informacion"
            className="game-hud__reference-button--small game-hud__reference-button--info"
            iconSrc={RAW_ICON_PATHS.info}
            onClick={onInfo}
          />
          <ReferenceButton
            ariaLabel="Autoplay"
            className="game-hud__reference-button--small"
            disabled={disabled || spinBusy || autoplayRunning}
            iconSrc={RAW_ICON_PATHS.autospin}
            onClick={onAutoplay}
          />
          <SpinModeButton disabled={disabled} spinMode={spinMode} onClick={onSpinMode} />
          <ReferenceButton
            ariaLabel="Selector de apuesta"
            className="game-hud__reference-button--small game-hud__reference-button--coin"
            disabled={disabled || spinBusy || autoplayRunning}
            iconSrc={RAW_ICON_PATHS.coin}
            onClick={onBetSelector}
          />
          <ReferenceButton
            ariaLabel="Menu"
            className="game-hud__reference-button--small game-hud__reference-button--menu"
            iconSrc={RAW_ICON_PATHS.menu}
            onClick={onMenu}
          />
        </div>
      </div>

      <div
        className="game-hud__balance-line"
        data-layout-target="footer-balance-line"
        style={rectStyle(LAYOUT_CONFIG.v2Footer.balanceLine)}
      >
        <div className="game-hud__balance-values">
          <span>BALANCE</span>
          <strong>{formatMoney(balance)}</strong>
          <span>APUESTA</span>
          <strong>{formatMoney(bet)}</strong>
        </div>
        <span className="game-hud__round-number">{`RONDA #${formatRoundNumber(roundNumber)}`}</span>
      </div>
    </>
  );
}

function SpinModeButton({
  disabled,
  spinMode,
  onClick,
}: {
  disabled: boolean;
  spinMode: SpinMode;
  onClick: () => void;
}) {
  return (
    <span className="game-hud__reference-button-frame">
      <button
        className={[
          "game-hud__reference-button",
          "game-hud__reference-button--pill",
          "game-hud__reference-button--spin-mode",
          `is-mode-${spinMode}`,
          spinMode > 1 ? "is-active" : "",
          disabled ? "game-hud__creator-button--locked" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        type="button"
        aria-label={`Modo de spin ${spinMode}`}
        aria-pressed={spinMode > 1}
        disabled={disabled}
        onClick={onClick}
        onDragStart={(event) => event.preventDefault()}
        draggable={false}
      >
        <span className="game-hud__spin-mode-arrows" aria-hidden="true">
          {SPIN_MODES.map((mode) => (
            <span
              key={mode}
              className={["game-hud__spin-mode-arrow", mode <= spinMode ? "is-active" : "is-muted"]
                .filter(Boolean)
                .join(" ")}
              style={{ "--hud-icon-url": `url("${RAW_ICON_PATHS.arrow}")` } as CSSProperties}
            />
          ))}
        </span>
      </button>
    </span>
  );
}

export function HudSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="game-hud__switch-row">
      <span>{label}</span>
      <input
        className="game-hud__switch-input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="game-hud__switch-track" aria-hidden="true">
        <span className="game-hud__switch-copy">{checked ? "ON" : "OFF"}</span>
        <span className="game-hud__switch-thumb" />
      </span>
    </label>
  );
}

export function BetControlRow({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="game-hud__bet-control-row">
      <ModalIconButton
        ariaLabel={`Reducir ${label}`}
        iconSrc={RAW_ICON_PATHS.minus}
        onClick={onDecrease}
      />
      <span className="game-hud__bet-control-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      <ModalIconButton
        ariaLabel={`Aumentar ${label}`}
        iconSrc={RAW_ICON_PATHS.plus}
        onClick={onIncrease}
      />
    </div>
  );
}

function ModalIconButton({
  ariaLabel,
  iconSrc,
  onClick,
}: {
  ariaLabel: string;
  iconSrc: string;
  onClick: () => void;
}) {
  return (
    <button
      className="game-hud__modal-control-button game-hud__modal-icon-button"
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <ModalIcon iconSrc={iconSrc} />
    </button>
  );
}

export function ModalIcon({ iconSrc, className = "" }: { iconSrc: string; className?: string }) {
  return (
    <span
      className={["game-hud__reference-icon", "game-hud__modal-icon", className]
        .filter(Boolean)
        .join(" ")}
      style={{ "--hud-icon-url": `url("${iconSrc}")` } as CSSProperties}
      aria-hidden="true"
    />
  );
}

function ReferenceButton({
  ariaLabel,
  className,
  disabled = false,
  iconSrc,
  isActive = false,
  label,
  onClick,
}: {
  ariaLabel: string;
  className: string;
  disabled?: boolean;
  iconSrc?: string;
  isActive?: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <span className="game-hud__reference-button-frame">
      <button
        className={[
          "game-hud__reference-button",
          className,
          disabled ? "game-hud__creator-button--locked" : "",
          isActive ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        type="button"
        aria-label={ariaLabel}
        aria-pressed={isActive ? true : undefined}
        disabled={disabled}
        onClick={onClick}
        onDragStart={(event) => event.preventDefault()}
        draggable={false}
      >
        {iconSrc ? (
          <span
            className="game-hud__reference-icon"
            style={{ "--hud-icon-url": `url("${iconSrc}")` } as CSSProperties}
            aria-hidden="true"
          />
        ) : null}
        {label ? <span className="game-hud__reference-label">{label}</span> : null}
      </button>
    </span>
  );
}

export function HudModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="game-hud__modal-backdrop">
      <button
        className="game-hud__modal-scrim"
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <section className="game-hud__modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="game-hud__modal-header">
          <h2>{title}</h2>
          <button
            className="game-hud__modal-close"
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            X
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function SymbolPreview({
  item,
  frame,
}: {
  item: PaytableItem;
  frame: AtlasPreviewFrame | undefined;
}) {
  if (!frame) {
    return (
      <span
        className="game-hud__symbol-fallback"
        style={{ backgroundColor: `#${item.color.toString(16).padStart(6, "0")}` }}
      >
        {item.label.slice(0, 2)}
      </span>
    );
  }

  const maxSize = 84;
  const scale = Math.min(maxSize / frame.frame.w, maxSize / frame.frame.h);
  const style: CSSProperties = {
    width: Math.round(frame.frame.w * scale),
    height: Math.round(frame.frame.h * scale),
    backgroundImage: `url(${frame.image})`,
    backgroundPosition: `${Math.round(-frame.frame.x * scale)}px ${Math.round(
      -frame.frame.y * scale,
    )}px`,
    backgroundSize: `${Math.round(frame.atlasSize.w * scale)}px ${Math.round(
      frame.atlasSize.h * scale,
    )}px`,
  };

  return (
    <span className="game-hud__symbol-preview">
      <span style={style} />
    </span>
  );
}
