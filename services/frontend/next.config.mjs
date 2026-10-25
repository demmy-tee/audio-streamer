/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendHost =
      process.env.INTERNAL_API_URL ||
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8000";

    let target = backendHost.trim().replace(/\/$/, "");
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `http://${target}`;
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
