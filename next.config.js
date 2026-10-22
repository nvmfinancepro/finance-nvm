/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Domaine officiel = https://nvm-finance.fr (sans www) : une seule 301 directe,
      // chemin conservé. /api exclu pour ne pas casser un webhook configuré sur www.
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "www.nvm-finance.fr" }],
        destination: "https://nvm-finance.fr/:path",
        statusCode: 301,
      },
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
