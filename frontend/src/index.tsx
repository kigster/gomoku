/**
 * Main Application Entry Point
 *
 * This file initializes the React application and renders the root component.
 * Sets up React 18's concurrent features and development mode safeguards.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Global styles and TailwindCSS imports
import GomokuGame from "./game.tsx"; // Main game component

// Create React 18 root for concurrent features and improved performance
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement // Mount point defined in public/index.html
);

// Render the application with React StrictMode for development safety
root.render(
  <React.StrictMode>
    {/* StrictMode enables additional checks and warnings in development:
        - Identifies components with unsafe lifecycles
        - Warns about legacy string ref API usage  
        - Warns about deprecated findDOMNode usage
        - Detects unexpected side effects
        - Detects legacy context API */}
    <GomokuGame />
  </React.StrictMode>
);
