import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Myndir koma bæði úr /public og frá WooCommerce (vörumyndir við innflutning)
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  // Tryggir að Prisma vélin (libquery_engine-rhel-openssl-3.0.x) fylgi með í Netlify fallinu
  outputFileTracingIncludes: { "/**": ["./node_modules/.prisma/client/**/*"] },
};

export default nextConfig;
