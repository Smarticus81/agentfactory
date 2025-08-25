/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose',
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth']
  },
  transpilePackages: ['pdf-parse'],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };
    
    // Fix punycode deprecation warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      punycode: 'punycode/',
    };
    
    // Optimize chunk loading
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all'
          }
        }
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
