export const ASSETS_CONFIG = {
  runtimeBasePath: "/assets-v2",
  manifests: {
    audio: "/assets-v2/audio/manifest.json",
  },
  delivery: {
    basePath: "/assets-v2/delivery",
    manifests: {
      scene: "/assets-v2/delivery/manifests/scene.json",
      loading: "/assets-v2/delivery/manifests/loading.json",
      symbols: "/assets-v2/delivery/manifests/symbols.json",
    },
  },
  footerControls: {
    rawBasePath: "/raw",
    icons: [
      "icon_arrow.svg",
      "icon_autospin.svg",
      "icon_coin.svg",
      "icon_info.svg",
      "icon_menu.svg",
      "icon_minus.svg",
      "icon_plus.svg",
      "icon_spin.svg",
      "icon_stop.svg",
    ],
  },
  imagePolicy: {
    format: "svg",
    webpIgnoredByProjectDecision: true,
  },
  categories: ["footer-controls", "audio", "delivery"],
} as const;
