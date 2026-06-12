import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

interface Size {
  width: number;
  height: number;
}

interface FitOptions {
  size: number;
  padding: number;
}

interface FitResult {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface AtlasFrame {
  name: string;
  sourcePath: string;
  symbol: string;
  animation: boolean;
  frameNumber: number;
}

interface PackedAtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
}

interface DeliverySymbolManifest {
  image: string;
  frameSize: number;
  frames: Record<string, PackedAtlasFrame>;
  animations: Record<string, string[]>;
  staticFrames: Record<string, string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(projectRoot, "..");
const deliveryOutputRoot = path.join(projectRoot, "public", "assets-v2", "delivery");

const symbolSourceMap: Record<string, string> = {
  telefono7: path.join("Simbolos de Slotmachine", "Telefono7"),
  dwild: path.join("Simbolos de Slotmachine", "D Wild"),
  ubicacion: path.join("Simbolos de Slotmachine", "Ubicacion"),
  casco: path.join("Simbolos de Slotmachine", "Casco"),
  cupon: path.join("Simbolos de Slotmachine", "Cupon"),
  campana: path.join("Simbolos de Slotmachine", "Campana"),
  cronometro: path.join("Simbolos de Slotmachine", "Cronometro"),
  vaso: path.join("Simbolos de Slotmachine", "VasoPipote"),
  hamburguesa: path.join("Simbolos de Slotmachine", "Hamburguesa"),
  pizza: path.join("Simbolos de Slotmachine", "Pizza"),
  sushi: path.join("Simbolos de Slotmachine", "Sushi"),
  fideos: path.join("Simbolos de Slotmachine", "Fideos"),
  papas: path.join("Simbolos de Slotmachine", "Papas fritas"),
  a: path.join("Simbolos de Slotmachine", "A"),
  k: path.join("Simbolos de Slotmachine", "K"),
  q: path.join("Simbolos de Slotmachine", "Q"),
  j: path.join("Simbolos de Slotmachine", "J"),
  "10": path.join("Simbolos de Slotmachine", "10"),
};

const sceneAssets = {
  backgroundSky: { source: "BackGroundSky.png", output: "scene/background_sky.webp" },
  backgroundCity: { source: "BackGroundCity.png", output: "scene/background_city.webp" },
  cloud: { source: "Cloud.png", output: "scene/cloud.webp" },
  title: { source: "DeliveryTitle.png", output: "scene/delivery_title.webp" },
  board: { source: "SlotMachineStylized.png", output: "scene/slot_machine_board.webp" },
};

const loadingAssets = {
  background: {
    source: path.join("Pantalla de Carga", "BackgroundLoading.png"),
    output: "loading/background_loading.webp",
  },
  exemplar: {
    source: path.join("Pantalla de Carga", "Ejemplar.png"),
    output: "loading/loading_exemplar.webp",
  },
  title: {
    source: path.join("Pantalla de Carga", "Titular.png"),
    output: "loading/titular.webp",
  },
  rider: {
    source: path.join("Pantalla de Carga", "Moterito.png"),
    output: "loading/moterito.webp",
  },
  pin: {
    source: path.join("Pantalla de Carga", "Pin Gps.png"),
    output: "loading/pin_gps.webp",
  },
};

export function normalizeDeliveryAssetName(value: string): string {
  const name = value.replace(/\.[^.]+$/u, "").trim().toLowerCase();
  const withoutAccents = name.normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
  const compact = withoutAccents
    .replace(/papas\s+fritas/u, "papas")
    .replace(/\s+/gu, "_")
    .replace(/[^a-z0-9_]+/gu, "")
    .replace(/^d_wild$/u, "dwild");
  return compact.replace(/^loadingloading_/u, "loading_loading_");
}

export function getDeliveryFrameNumber(fileName: string): number {
  const normalized = fileName.toLowerCase();
  const paddedFrame = normalized.match(/_(\d{4})(?:_|\.|-)/u);
  if (paddedFrame?.[1]) {
    return Number(paddedFrame[1]);
  }

  const numbers = [...normalized.matchAll(/\d+/gu)].map((match) => Number(match[0]));
  return numbers.at(-1) ?? 0;
}

export function getFitWithinCanvas(image: Size, options: FitOptions): FitResult {
  const maxSize = options.size - options.padding * 2;
  const scale = Math.min(maxSize / image.width, maxSize / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  return {
    width,
    height,
    left: Math.round((options.size - width) / 2),
    top: Math.round((options.size - height) / 2),
  };
}

async function getPngFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => {
      const frameDelta = getDeliveryFrameNumber(left) - getDeliveryFrameNumber(right);
      return frameDelta === 0 ? left.localeCompare(right) : frameDelta;
    });
}

async function resizeIntoTransparentCell(sourcePath: string, size: number): Promise<Buffer> {
  const metadata = await sharp(sourcePath).metadata();
  const fit = getFitWithinCanvas(
    { width: metadata.width ?? size, height: metadata.height ?? size },
    { size, padding: 6 },
  );
  const resized = await sharp(sourcePath)
    .resize(fit.width, fit.height, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: fit.left, top: fit.top }])
    .png()
    .toBuffer();
}

async function buildSymbolAtlas(): Promise<DeliverySymbolManifest> {
  const frameSize = 106;
  const atlasWidth = 1024;
  const atlasFrames: AtlasFrame[] = [];

  for (const [symbol, relativeSourceDirectory] of Object.entries(symbolSourceMap)) {
    const sourceDirectory = path.join(sourceRoot, relativeSourceDirectory);
    const files = await getPngFiles(sourceDirectory);
    files.forEach((sourcePath, index) => {
      const frameNumber = getDeliveryFrameNumber(sourcePath);
      atlasFrames.push({
        name: files.length > 1 ? `${symbol}_${String(frameNumber).padStart(4, "0")}.png` : `${symbol}.png`,
        sourcePath,
        symbol,
        animation: files.length > 1,
        frameNumber: files.length > 1 ? frameNumber : index,
      });
    });
  }

  const columns = Math.floor(atlasWidth / frameSize);
  const atlasHeight = Math.ceil(atlasFrames.length / columns) * frameSize;
  const composites = await Promise.all(
    atlasFrames.map(async (frame, index) => ({
      input: await resizeIntoTransparentCell(frame.sourcePath, frameSize),
      left: (index % columns) * frameSize,
      top: Math.floor(index / columns) * frameSize,
    })),
  );

  await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 88, alphaQuality: 95 })
    .toFile(path.join(deliveryOutputRoot, "symbols", "delivery_symbols.webp"));

  const frames: Record<string, PackedAtlasFrame> = {};
  const animations: Record<string, string[]> = {};
  const staticFrames: Record<string, string> = {};
  atlasFrames.forEach((frame, index) => {
    frames[frame.name] = {
      frame: {
        x: (index % columns) * frameSize,
        y: Math.floor(index / columns) * frameSize,
        w: frameSize,
        h: frameSize,
      },
      sourceSize: { w: frameSize, h: frameSize },
      spriteSourceSize: { x: 0, y: 0, w: frameSize, h: frameSize },
    };
    if (frame.animation) {
      animations[frame.symbol] = [...(animations[frame.symbol] ?? []), frame.name];
      staticFrames[frame.symbol] ??= frame.name;
    } else {
      staticFrames[frame.symbol] = frame.name;
    }
  });

  return {
    image: "/assets-v2/delivery/symbols/delivery_symbols.webp",
    frameSize,
    frames,
    animations,
    staticFrames,
  };
}

async function writeSceneAssets(): Promise<void> {
  const manifest: Record<string, { src: string; width: number; height: number }> = {};
  for (const [key, asset] of Object.entries(sceneAssets)) {
    const outputPath = path.join(deliveryOutputRoot, asset.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(path.join(sourceRoot, asset.source)).webp({ quality: 88 }).toFile(outputPath);
    const metadata = await sharp(outputPath).metadata();
    manifest[key] = {
      src: `/assets-v2/delivery/${asset.output.replaceAll("\\", "/")}`,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    };
  }

  const motorizadoSource = path.join(sourceRoot, "Motorizado");
  const motorizadoOutput = path.join(deliveryOutputRoot, "scene", "motorizado");
  await mkdir(motorizadoOutput, { recursive: true });
  const motorizadoFiles = await getPngFiles(motorizadoSource);
  const motorizadoFrames: string[] = [];
  for (const sourcePath of motorizadoFiles) {
    const frameNumber = getDeliveryFrameNumber(sourcePath);
    const outputName = `motorizado_${String(frameNumber).padStart(4, "0")}.webp`;
    await sharp(sourcePath)
      .resize({ width: 360, height: 640, fit: "inside" })
      .webp({ quality: 82 })
      .toFile(path.join(motorizadoOutput, outputName));
    motorizadoFrames.push(`/assets-v2/delivery/scene/motorizado/${outputName}`);
  }

  await writeJson(path.join(deliveryOutputRoot, "manifests", "scene.json"), {
    assets: manifest,
    motorizado: { fps: 18, frames: motorizadoFrames },
  });
}

async function writeLoadingAssets(): Promise<void> {
  const assets: Record<string, { src: string }> = {};
  for (const [key, asset] of Object.entries(loadingAssets)) {
    const outputPath = path.join(deliveryOutputRoot, asset.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(path.join(sourceRoot, asset.source)).webp({ quality: 88 }).toFile(outputPath);
    assets[key] = { src: `/assets-v2/delivery/${asset.output.replaceAll("\\", "/")}` };
  }

  const loadingSource = path.join(sourceRoot, "Pantalla de Carga");
  const frameFiles = (await getPngFiles(loadingSource)).filter((file) =>
    path.basename(file).toLowerCase().startsWith("loadingloading"),
  );
  const frames: string[] = [];
  for (const sourcePath of frameFiles) {
    const frameNumber = getDeliveryFrameNumber(sourcePath);
    const outputName = `loading_bar_${String(frameNumber).padStart(4, "0")}.webp`;
    await sharp(sourcePath)
      .resize({ width: 760, fit: "inside" })
      .webp({ quality: 88 })
      .toFile(path.join(deliveryOutputRoot, "loading", outputName));
    frames.push(`/assets-v2/delivery/loading/${outputName}`);
  }

  await writeJson(path.join(deliveryOutputRoot, "manifests", "loading.json"), {
    assets,
    loadingBar: { fps: 12, frames },
  });
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function generateDeliveryAtlases(): Promise<void> {
  await rm(deliveryOutputRoot, { recursive: true, force: true });
  await mkdir(path.join(deliveryOutputRoot, "symbols"), { recursive: true });
  await mkdir(path.join(deliveryOutputRoot, "manifests"), { recursive: true });

  const symbolManifest = await buildSymbolAtlas();
  await writeJson(path.join(deliveryOutputRoot, "manifests", "symbols.json"), symbolManifest);
  await writeSceneAssets();
  await writeLoadingAssets();
}

if (process.argv[1] === __filename) {
  generateDeliveryAtlases().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
