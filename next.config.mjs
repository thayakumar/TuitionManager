/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
