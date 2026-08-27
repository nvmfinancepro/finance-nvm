/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/demo",
        destination: "/on-vous-montre",
        permanent: true,
      },
      {
        source: "/site",
        destination: "/",
        permanent: true,
      },
      {
        source: "/site/services",
        destination: "/services",
        permanent: true,
      },
      {
        source: "/site/cgv",
        destination: "/cgv",
        permanent: true,
      },
      {
        source: "/site/confidentialite",
        destination: "/confidentialite",
        permanent: true,
      },
      {
        source: "/site/mentions-legales",
        destination: "/mentions-legales",
        permanent: true,
      },
    ];
  },
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
