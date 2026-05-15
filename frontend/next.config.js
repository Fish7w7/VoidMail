/** @type {import('next').NextConfig} */
const apiBase = process.env.VOIDMAIL_BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = nextConfig;
