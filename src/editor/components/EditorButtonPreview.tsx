import type { CSSProperties, MouseEventHandler, PointerEventHandler } from "react";
import { EditorIcon } from "./EditorIcon";

function getHudReferenceClasses(className: string): string[] {
  if (className.includes("is-spin")) {
    return ["game-hud__reference-button--spin", "game-hud__reference-spin"];
  }
  if (className.includes("is-info")) {
    return ["game-hud__reference-button--small", "game-hud__reference-button--info"];
  }
  if (className.includes("is-bet")) {
    return ["game-hud__reference-button--small", "game-hud__reference-button--coin"];
  }
  if (className.includes("is-menu")) {
    return ["game-hud__reference-button--small", "game-hud__reference-button--menu"];
  }
  if (className.includes("is-autoplay")) {
    return ["game-hud__reference-button--small"];
  }
  if (className.includes("is-arrow")) {
    return ["game-hud__reference-button--pill"];
  }
  return ["game-hud__reference-button--round"];
}

export function EditorButtonPreview({
  className = "",
  iconSrc,
  isDisabledByModule = false,
  isPlayLocked = false,
  isOutsideCanvas = false,
  label,
  layerId,
  onClick,
  onPointerDown,
  style,
}: {
  className?: string;
  iconSrc: string;
  isDisabledByModule?: boolean;
  isPlayLocked?: boolean;
  isOutsideCanvas?: boolean;
  label: string;
  layerId: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
}) {
  const isArrowButton = className.includes("is-arrow");

  return (
    <button
      className={[
        "slot-editor__hud-button",
        "game-hud__reference-button",
        ...getHudReferenceClasses(className),
        isPlayLocked ? "is-play-locked" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-label={label}
      {...(isOutsideCanvas ? { "data-outside-layer-id": layerId } : { "data-layer-id": layerId })}
      {...(isDisabledByModule ? { "data-layer-disabled": "true" } : {})}
      disabled={isPlayLocked}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={style}
    >
      {isArrowButton ? (
        <span className="slot-editor__arrow-icon-group" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <EditorIcon
              iconSrc={iconSrc}
              key={index}
              label={label}
              layerId={`${layerId}-${index}`}
            />
          ))}
        </span>
      ) : (
        <EditorIcon iconSrc={iconSrc} label={label} layerId={layerId} />
      )}
    </button>
  );
}
