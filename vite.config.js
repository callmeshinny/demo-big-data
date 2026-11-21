import { defineConfig } from "vite";

// Relative base: the same build works at a domain root (Render, S3) or under a sub-path.
export default defineConfig({
  base: "./",
});
