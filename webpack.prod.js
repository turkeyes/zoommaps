const merge = require('webpack-merge');
const common = require('./webpack.common.js');

const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');


// use MiniCssExtractPlugin.loader instead of style-loader
// this extracts css to 1 file per page
common.module.rules.forEach(({ use }) => {
  if (use.indexOf && use.splice) {
    const i = use.indexOf('style-loader');
    if (i >= 0) {
      use.splice(i, 1, MiniCssExtractPlugin.loader);
    }
  }
});

// names are hashed to help with browser caching
module.exports = merge(common, {
  mode: 'production',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].js',
  },
  plugins: [
    new webpack.HashedModuleIdsPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[name].[contenthash].css',
    }),
  ],
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
      }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
});
