/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cursor / tunnel previews sometimes hit the app via 127.0.2.2
  allowedDevOrigins: ['127.0.2.2'],
}

export default nextConfig
