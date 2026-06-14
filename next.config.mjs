const nextConfig = {
  reactStrictMode: false,
  experimental: {
    // Some versions use this
  },
  // Allow mobile LAN testing (HMR)
  allowedDevOrigins: ['192.168.1.67', '192.168.1.1', 'localhost', '0.0.0.0', '192.168.0.0/16', '10.0.0.0/8'],
};

export default nextConfig;
