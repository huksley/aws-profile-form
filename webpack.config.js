const path = require("path");
const webpack = require("webpack");
const entry = "./src/index.jsx";
const outputPath = path.resolve(process.cwd(), "dist");
const publicPath = process.env.PUBLIC_PATH || "/";
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const clientConfig = {
  entry: {
    app: entry
  },
  target: "web",
  devtool: "source-map",
  devServer: {
    writeToDisk: true
  },
  mode: process.env.NODE_ENV == "production" ? "production" : "development",
  output: {
    path: outputPath,
    publicPath,
    filename: "[id].js"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.(gif|png|jpe?g|svg|woff|eot|woff2|ttf)$/i,
        use: [
          "file-loader",
          {
            loader: "image-webpack-loader",
            options: {
              bypassOnDebug: true
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: process.env.NODE_ENV === "development"
            }
          },
          "css-loader",
          "sass-loader"
        ]
      }
    ]
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin({ verbose: true }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css"
    }),
    new HtmlWebpackPlugin({
      // Load a custom template (lodash by default)
      template: "src/index.html"
    }),
    new CopyWebpackPlugin([
      { from: "assets", to: "assets/" },
      { from: "public" },
      // Service worker for processing Google FCM messages (no webpack.DefinePlugin so process constants manually)
      { from: "src/firebase-messaging-sw.js", transform: (content) => {
        let s = String(content)
        s = s.replace("process.env.FCM_MESSAGING_SENDERID", JSON.stringify(process.env.FCM_MESSAGING_SENDERID))
        return s
      }},
      // Firebase libraries for service worker
      { from: "node_modules/firebase/firebase-app.js", to: "worker/firebaseApp.js" },
      { from: "node_modules/firebase/firebase-messaging.js", to: "worker/firebaseMessaging.js" }
    ]),
    // During the build make literal replacements on client side for
    // configuration values, because there is no process.env
    new webpack.DefinePlugin({
      "process.env.PUBLIC_PATH": JSON.stringify(publicPath),
      "process.env.API_UPLOAD_HANDLER_URL": JSON.stringify(
        process.env.API_UPLOAD_HANDLER_URL || "http://localhost:3000/api"
      ),
      "process.env.API_MESSAGING_URL": JSON.stringify(
        process.env.API_MESSAGING_URL || "http://localhost:3000/api"
      ),
      "process.env.IMAGE_BUCKET": JSON.stringify(
        process.env.IMAGE_BUCKET || "sample-bucket"
      ),
      "process.env.FCM_MESSAGING_SENDERID": JSON.stringify(
        process.env.FCM_MESSAGING_SENDERID || ""
      ),
      "process.env.FCM_VAPID_KEY": JSON.stringify(
        process.env.FCM_VAPID_KEY || ""
      ),
      "process.env.FCM_APIKEY": JSON.stringify(
        process.env.FCM_APIKEY || ""
      ),
      "process.env.FCM_APPID": JSON.stringify(
        process.env.FCM_APPID || ""
      ),
      "process.env.AWS_REGION": JSON.stringify(
        process.env.AWS_REGION || "eu-west-1"
      )
    }),
  ]
};

module.exports = clientConfig;
