export interface RectLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

interface ScaledRectLayout extends RectLayout {
  scaleX?: number;
  scaleY?: number;
}

export interface FootShadowLayout {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  alpha: number;
  blur?: number;
  zIndex?: number;
}

interface HeaderItemLayout extends RectLayout {
  shadow?: FootShadowLayout;
}

interface HeaderLayout {
  baseWidth: number;
  baseHeight: number;
  background: RectLayout;
  items: {
    logo: RectLayout;
    tagline: RectLayout;
    head: RectLayout;
    whiteCock: HeaderItemLayout;
    blackRoaster: HeaderItemLayout;
  };
}

interface FooterLayout {
  container: ScaledRectLayout;
  base: RectLayout;
  panel: RectLayout;
  referenceFooter: RectLayout;
  buttons: {
    play: RectLayout;
    minus: RectLayout;
    plus: RectLayout;
    sound: RectLayout;
  };
  balanceLine: RectLayout;
  localTime: RectLayout;
}

interface LayoutConfig {
  mobileLayoutOffsetYDelta: number;
  v2Board: RectLayout;
  v2GridFrameSlots: RectLayout;
  v2TopMenu: RectLayout;
  v2TensionBar: RectLayout;
  v2WildRooster: RectLayout;
  v2Footer: FooterLayout;
  header: HeaderLayout;
}

export const LAYOUT_CONFIG: LayoutConfig = {
  mobileLayoutOffsetYDelta: -48,
  v2Board: {
    x: 64,
    y: 613,
    width: 1003,
    height: 789,
    zIndex: 110,
  },
  v2GridFrameSlots: {
    x: -23,
    y: -16,
    width: 586,
    height: 506,
    zIndex: 0,
  },
  v2TopMenu: {
    x: 881,
    y: 1769,
    width: 100,
    height: 100,
    zIndex: 260,
  },
  v2TensionBar: {
    x: 171,
    y: 661,
    width: 55,
    height: 365,
    zIndex: 118,
  },
  v2WildRooster: {
    x: 96,
    y: 900,
    width: 140,
    height: 185,
    zIndex: 119,
  },
  v2Footer: {
    container: {
      x: 28,
      y: 295,
      width: 1024,
      height: 1525,
      scaleX: 1,
      scaleY: 1,
      zIndex: 230,
    },
    base: {
      x: 0,
      y: -10,
      width: 1,
      height: 1,
      zIndex: 0,
    },
    panel: {
      x: 0,
      y: 1416,
      width: 1024,
      height: 194,
      zIndex: 230,
    },
    referenceFooter: {
      x: 0,
      y: 1496,
      width: 1080,
      height: 424,
      zIndex: 790,
    },
    buttons: {
      play: {
        x: 429,
        y: 1442,
        width: 169,
        height: 175,
      },
      minus: {
        x: 290,
        y: 1492,
        width: 100,
        height: 100,
      },
      plus: {
        x: 632,
        y: 1492,
        width: 100,
        height: 100,
      },
      sound: {
        x: 761,
        y: 1492,
        width: 100,
        height: 100,
      },
    },
    balanceLine: {
      x: 112,
      y: 1844,
      width: 856,
      height: 48,
      zIndex: 860,
    },
    localTime: {
      x: 856,
      y: 16,
      width: 180,
      height: 34,
      zIndex: 780,
    },
  },
  header: {
    baseWidth: 1024,
    baseHeight: 540,
    background: {
      x: -100,
      y: -2,
      width: 1309,
      height: 644,
      zIndex: 10,
    },
    items: {
      logo: {
        x: -73,
        y: 45,
        width: 644,
        height: 312,
        zIndex: 40,
      },
      tagline: {
        x: 85,
        y: 220,
        width: 445,
        height: 151,
        zIndex: 41,
      },
      head: {
        x: 265,
        y: 11,
        width: 125,
        height: 163,
        zIndex: 38,
      },
      whiteCock: {
        x: 416,
        y: 272,
        width: 317,
        height: 317,
        zIndex: 55,
        shadow: {
          centerX: 0.52,
          centerY: 0.9,
          width: 0.55,
          height: 0.13,
          alpha: 0.42,
          blur: 12,
        },
      },
      blackRoaster: {
        x: 719,
        y: 290,
        width: 292,
        height: 292,
        zIndex: 21,
        shadow: {
          centerX: 0.48,
          centerY: 0.9,
          width: 0.58,
          height: 0.14,
          alpha: 0.45,
          blur: 12,
        },
      },
    },
  },
};

export const V2_BOARD_LAYOUT = LAYOUT_CONFIG.v2Board;
export const V2_GRID_FRAME_SLOTS_LAYOUT = LAYOUT_CONFIG.v2GridFrameSlots;
export const HEADER_LAYOUT = LAYOUT_CONFIG.header;
