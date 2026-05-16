/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "nvm-finance.fr",
        "www.nvm-finance.fr",
        "nvm-finance.vercel.app",
      ],
    },
  },
};

module.exports = nextConfig;
