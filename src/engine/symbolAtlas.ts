export type AtlasTextureEntry<T> = readonly [name: string, texture: T];

function getAtlasLeafName(name: string): string {
  const leaf = name.split("/").at(-1) ?? name;
  return leaf.replace(/\.png$/i, "").toLowerCase();
}

function getFrameSortValue(name: string): number {
  const leaf = getAtlasLeafName(name);
  const exportedFrame = leaf.match(/_(\d{4})(?:_|\.|-|$)/);
  const matches = [...leaf.matchAll(/\d+/g)];
  if (exportedFrame?.[1] && (/capa-\d+/i.test(leaf) || matches.length === 1)) {
    return Number(exportedFrame[1]);
  }

  const lastMatch = matches.at(-1);
  return lastMatch ? Number(lastMatch[0]) : 0;
}

function matchesSymbolAtlasBase(name: string, atlasBase: string): boolean {
  const leaf = getAtlasLeafName(name);
  const base = atlasBase.toLowerCase();
  return leaf === base || leaf.startsWith(`${base}_`) || leaf.startsWith(`${base}-`);
}

export function collectSymbolAnimationFrames<T>(
  entries: AtlasTextureEntry<T>[],
  atlasBase: string,
): T[] {
  return entries
    .filter(([name]) => matchesSymbolAtlasBase(name, atlasBase))
    .sort(([leftName], [rightName]) => {
      const frameDelta = getFrameSortValue(leftName) - getFrameSortValue(rightName);
      return frameDelta === 0 ? leftName.localeCompare(rightName) : frameDelta;
    })
    .map(([, texture]) => texture);
}
