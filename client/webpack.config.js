const path = require('path');

// Suppress webpack-dev-server deprecation warnings
const originalStderrWrite = process.stderr.write;
process.stderr.write = function(chunk, ...args) {
  if (typeof chunk === 'string' && (
    chunk.includes('DEP_WEBPACK_DEV_SERVER_ON_AFTER_SETUP_MIDDLEWARE') ||
    chunk.includes('DEP_WEBPACK_DEV_SERVER_ON_BEFORE_SETUP_MIDDLEWARE')
  )) {
    return;
  }
  return originalStderrWrite.call(process.stderr, chunk, ...args);
};

module.exports = {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      return middlewares;
    },
  },
  resolve: {
    fallback: {
      "util": require.resolve("util/")
    }
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};
