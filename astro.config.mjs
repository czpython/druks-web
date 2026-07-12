import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://druks.ai",
  devToolbar: {
    enabled: false,
  },
  output: "static",
});
