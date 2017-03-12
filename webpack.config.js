const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: ['./web/static/js/app.js'],
  output: {
    path: './priv/static/dist',
    filename: 'app.js',
  },
  plugins: [
    new CopyWebpackPlugin([{ from: './web/static/assets/', to: '../' }]),
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['env'],
        },
      },
    ],
  },
}
