const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const precss = require('precss');
const autoprefixer = require('autoprefixer');

const APP_NAME = 'app';
const OUTPUT_PATH = 'dist';

module.exports = {
  entry: {
    app: './frontend/index.js',
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].bundle.js',
    path: path.resolve(__dirname, OUTPUT_PATH),
    publicPath: '/'
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: APP_NAME,
      template: 'frontend/index.html',
    })
  ],
  module: {
    rules: [
      // transpile code to older syntax & add polyfills
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  useBuiltIns: "entry"
                }
              ]
            ],
            compact: true
          },
        },
      },
      // CSS is a subset of SCSS so this is fine
      {
        test: /\.s?css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [
                precss,
                autoprefixer,
              ],
            },
          },
          {
            loader: 'sass-loader',
            options: {
              includePath: [
                path.resolve(__dirname, 'node_modules')
              ]
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'file-loader',
        ],
      },
      {
        test: /\.html$/,
        exclude: /node_modules/,
        use: [
          'html-loader',
        ],
      },
    ],
  },
  // creates a single file for all 3rd-party code
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};
