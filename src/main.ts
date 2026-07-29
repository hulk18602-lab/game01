import "../styles/main.css";
import "./ui/game-ui.css";
import { GameApplication } from "./app/GameApplication.js";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app application root");

const game = new GameApplication(root);
game.start();

if (import.meta.hot) import.meta.hot.dispose(() => game.destroy());
