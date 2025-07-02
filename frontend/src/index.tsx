import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import GomokuGame from "./game.tsx";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <GomokuGame />
  </React.StrictMode>
);
