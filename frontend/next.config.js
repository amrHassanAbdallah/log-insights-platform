/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@apollo/client'],
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig; 