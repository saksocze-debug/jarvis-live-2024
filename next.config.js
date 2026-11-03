/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  output: 'standalone',
  experimental: { serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'] },
};
