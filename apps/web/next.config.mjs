/** @type {import('next').NextConfig} */
const isWindows = process.platform === "win32";

const nextConfig = {
  reactStrictMode: true,
  output: isWindows ? undefined : "standalone"
};

export default nextConfig;
