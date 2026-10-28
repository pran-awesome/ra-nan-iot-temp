/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(ino|sql)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
