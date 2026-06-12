import { createRoot } from "react-dom/client";
import { App } from "./App";

window.__SLOT_GAME_KIT_REACT_BOOTSTRAP__ = true;

const root = document.createElement("div");
root.id = "root";
document.body.appendChild(root);

createRoot(root).render(<App />);
