/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client"],
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
