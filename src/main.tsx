import { createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start";
import { getRouter } from "./router";
import "./index.css";

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StartClient router={router} />
);

