export type AudioEventId =
  | "button"
  | "toggleOff"
  | "bet"
  | "spin"
  | "slotReel"
  | "reelStop"
  | "reelStop1"
  | "reelStop2"
  | "reelStop3"
  | "reelStop4"
  | "reelStop5"
  | "slotLose1"
  | "slotLose2"
  | "tick"
  | "cascade"
  | "win"
  | "smallWin"
  | "bigWin"
  | "megaWin"
  | "jackpot"
  | "legendaryJackpot"
  | "fireworks"
  | "refill"
  | "wildExpand"
  | "wildSymbol"
  | "scatterTease"
  | "paylineTrace"
  | "coinPop"
  | "cascadeImpact"
  | "cascadeChain"
  | "freeSpinAward"
  | "nearMiss"
  | "gridPulse";

export interface DeliveryAssetRef {
  src: string;
  width?: number;
  height?: number;
}

export interface DeliverySceneManifest {
  assets: {
    backgroundSky: DeliveryAssetRef;
    backgroundCity: DeliveryAssetRef;
    cloud: DeliveryAssetRef;
    title: DeliveryAssetRef;
    board: DeliveryAssetRef;
  };
  motorizado: {
    fps: number;
    frames: string[];
  };
}

export interface DeliveryLoadingManifest {
  assets: {
    background: DeliveryAssetRef;
    exemplar: DeliveryAssetRef;
    title: DeliveryAssetRef;
    rider: DeliveryAssetRef;
    pin: DeliveryAssetRef;
  };
  loadingBar: {
    fps: number;
    frames: string[];
  };
}

export interface DeliveryAtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
}

export interface DeliverySymbolAtlasManifest {
  image: string;
  frameSize: number;
  frames: Record<string, DeliveryAtlasFrame>;
  animations: Record<string, string[]>;
  staticFrames: Record<string, string>;
}
