const path = require('path');

module.exports = {
  entry: {
    index: './index.js',
  },
  output: {
    filename: 'boundle.js',
    path: __dirname,
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      // {
      //   test: /\.css$/,
      //   include: /node_modules/,
      //   use: ['style-loader', 'css-loader'],
      // },

      // {
      //   test: /\.tsx?$/,
      //   exclude: /node_modules/,
      //   use: ['ts-loader'],
      // },
    ],
  },
  // resolve: {
  //   extensions: ['.ts', '.tsx', '.js'],
  // },
  devServer: {
    contentBase: __dirname,
    compress: true,
    port: 8000,
    disableHostCheck: true,
  },
};
