import { Assets, Rectangle, Sprite, Texture } from "pixi.js";
import { ASSETS_CONFIG } from "../config/assets.config";
import type { DeliverySceneManifest, DeliverySymbolAtlasManifest } from "../types/asset.types";

export async function loadDeliverySceneManifest(): Promise<DeliverySceneManifest> {
  return loadJson<DeliverySceneManifest>(ASSETS_CONFIG.delivery.manifests.scene);
}

export async function loadDeliverySymbolTextures(): Promise<{
  staticTextures: Map<string, Texture>;
  animationTextures: Map<string, Texture[]>;
}> {
  const manifest = await loadJson<DeliverySymbolAtlasManifest>(
    ASSETS_CONFIG.delivery.manifests.symbols,
  );
  const atlasTexture = await Assets.load<Texture>(manifest.image);
  const textures = new Map<string, Texture>();

  for (const [frameName, frameData] of Object.entries(manifest.frames)) {
    textures.set(
      frameName,
      new Texture({
        source: atlasTexture.source,
        frame: new Rectangle(
          frameData.frame.x,
          frameData.frame.y,
          frameData.frame.w,
          frameData.frame.h,
        ),
      }),
    );
  }

  const staticTextures = new Map<string, Texture>();
  for (const [symbol, frameName] of Object.entries(manifest.staticFrames)) {
    const texture = textures.get(frameName);
    if (texture) {
      staticTextures.set(symbol, texture);
    }
  }

  const animationTextures = new Map<string, Texture[]>();
  for (const [symbol, frameNames] of Object.entries(manifest.animations)) {
    const frames = frameNames.flatMap((frameName) => {
      const texture = textures.get(frameName);
      return texture ? [texture] : [];
    });
    if (frames.length > 1) {
      animationTextures.set(symbol, frames);
    }
  }

  return { staticTextures, animationTextures };
}

export async function loadDeliverySprite(path: string): Promise<Sprite> {
  const texture = await Assets.load<Texture>(path);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  return sprite;
}

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}
