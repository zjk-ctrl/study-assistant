import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  // Next.js 16 使用 Turbopack
  turbopack: {
    root: path.resolve(__dirname),
  },
  // 兼容 webpack 配置（用于服务端构建）
  webpack: (config, { isServer }) => {
    // 排除 coze-coding-dev-sdk 中的 Node.js 模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        pg: false,
      };
    }
    return config;
  },
};

export default nextConfig;
