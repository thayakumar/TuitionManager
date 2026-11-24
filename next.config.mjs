/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client"],
  async headers() {
    return ['gridcraft-web-fdc723373f2aa0d8.js', 'gridcraft-web-fdc723373f2aa0d8_bg.wasm'].map(asset => ({
      source: '/office-editor/gridcraft/' + asset,
      headers: [{key: 'Cache-Control', value: 'public, max-age=31536000, immutable'}],
    }));
  },
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
