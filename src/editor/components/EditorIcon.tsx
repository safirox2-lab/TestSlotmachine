import type { CSSProperties } from "react";

export function EditorIcon({
  iconSrc,
  label,
  layerId,
}: {
  iconSrc: string;
  label: string;
  layerId: string;
}) {
  return (
    <span
      className="slot-editor__icon game-hud__reference-icon"
      data-editor-icon={layerId}
      style={
        {
          "--editor-icon-url": `url("${iconSrc}")`,
          "--hud-icon-url": `url("${iconSrc}")`,
        } as CSSProperties
      }
      title={label}
      aria-hidden="true"
    />
  );
}
