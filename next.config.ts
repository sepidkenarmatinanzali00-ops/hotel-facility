import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // عکس‌های base64 (data URL) برای عکس‌های قبل/بعد از رفع خرابی
  images: {
    remotePatterns: [],
  },
};

// در محیط sandbox از standalone استفاده کن
if (process.env.SANDBOX_MODE === 'true' || !process.env.VERCEL) {
  (nextConfig as any).output = 'standalone'
}

export default nextConfig;
