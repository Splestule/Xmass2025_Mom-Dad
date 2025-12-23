import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    importScripts: ["/push-sw.js"],
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withPWA(nextConfig);
