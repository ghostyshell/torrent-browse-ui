const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Completely remove all TypeScript checking plugins
      webpackConfig.plugins = webpackConfig.plugins.filter((plugin) => {
        // Remove ForkTsCheckerWebpackPlugin completely
        if (plugin.constructor.name === 'ForkTsCheckerWebpackPlugin') {
          return false;
        }
        // Remove ESLintWebpackPlugin to save more memory
        if (plugin.constructor.name === 'ESLintWebpackPlugin') {
          return false;
        }
        return true;
      });

      // Disable TypeScript checking in development too
      if (env === 'development') {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          (plugin) => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
        );
      }

      // Optimize chunks for better memory usage
      if (webpackConfig.optimization) {
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              maxSize: 244000, // 244kb chunks max
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              maxSize: 244000,
            },
          },
        };
      }

      // Completely disable resolve plugins that might use TypeScript
      if (webpackConfig.resolve && webpackConfig.resolve.plugins) {
        webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
          (plugin) => plugin.constructor.name !== 'ModuleScopePlugin'
        );
      }

      return webpackConfig;
    },
  },
  // Disable TypeScript checking entirely
  typescript: {
    enableTypeChecking: false,
  },
  // Disable ESLint completely
  eslint: {
    enable: false,
  },
}; 
