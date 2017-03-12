Intro to Phoenix Framework, Webpack 2, and bootstrap-loader
=========================================================

I recently started an application in [Phoenix](http://www.phoenixframework.org/)/ Elixir after hearing an awesome talk by [Jose Valim](https://github.com/josevalim) at [Abstractions.io](http://abstractions.io/) this past year. I love the ecosystem and the `phoenix.new` generator, but since I am most familiar with Webpack, I wanted to use its build process for my front end assets. After looking around for some bootstrap tooling for theming, I stumbled across [bootstrap-loader](https://github.com/shakacode/bootstrap-loader) which allows you to compile bootstrap with different variables and write SASS using the bootstrap mixins. This leads to a nice auto-reloading development environment where we can easily test out new bootstrap themes, and modify them to our needs.

[Here is the link](https://github.com/awestbro/phoenix-webpack-bootstrap-starter) to the github repository where the final product is hosted:

## Creating a Phoenix App

[Phoenix Install Instructions](http://www.phoenixframework.org/docs/installation)
[Up and Running Guide](http://www.phoenixframework.org/docs/up-and-running)

Once you have elixir and the phoenix mix archives installed, you can create a new project by running: `mix phoenix.new myproject`. This will create a boilerplate starter application with brunch installed by default (don't worry, it's super easy to replace). Next, `cd myproject` and run `mix ecto.create`. This will create a database for our application and assumes Postgres is installed with a postgres superuser. To change the defaults, you can modify `config/dev.exs`.

## Replacing Brunch with Webpack

Much of this section was taken from: http://matthewlehner.net/using-webpack-with-phoenix-and-elixir/. This section will be a little different as I will be using yarn, webpack 2, and I won't be setting up any javascript rules. I'll leave that up to the reader to choose between babel, typescript, or whatever you like.

For handling front end via `npm`, I will be using [yarn](https://yarnpkg.com/en/). Why `yarn` over `npm`? It is an order of magnitude faster installing npm modules and it generates a `yarn.lock` file which locks your dependencies (and their dependencies) to specific versions, rather than using npm's `^` minor version update scheme.

First, lets get rid of the brunch configuration, `rm brunch-config.js`. Let's add `webpack` with `yarn add --dev webpack`. We can also delete the brunch dependencies in our `package.json` so that it looks like:

```
{
  "repository": {},
  "license": "MIT",
  "scripts": {
    "deploy": "webpack -p",
    "watch": "webpack --watch-stdin --progress --color"
  },
  "dependencies": {
    "phoenix": "file:deps/phoenix",
    "phoenix_html": "file:deps/phoenix_html"
  },
  "devDependencies": {
    "webpack": "^2.2.1"
  }
}
```

To handle javascript assets like brunch was, we should also install babel to convert the ES6 javascript to ES5.
https://github.com/babel/babel-loader
`yarn add --dev babel-loader babel-core babel-preset-env`. We also need a loader to copy our static assets to the output directory: `yarn add --dev copy-webpack-plugin`


Now let's make a `webpack.config.js`:

```
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
```

Our webpack config now handles copying everything from the assets folder and compiling our javascript for us. You can test it out by running `rm -rf priv/static/*` and `yarn deploy` and verifying that we have assets in: `priv/static/`. Now, we need to tell phoenix about our new build process. To do this, open up `config/dev.exs` and replace the watcher section to look like:

```
config :myproject, Myproject.Endpoint,
  http: [port: 4000],
  debug_errors: true,
  code_reloader: true,
  check_origin: false,
  watchers: [node: ["node_modules/webpack/bin/webpack.js", "--watch-stdin", "--progress", "--color",
                    cd: Path.expand("../", __DIR__)]]
```

This will run webpack's watch target when we start our server, so our changes will be compiled and dumped to our static asset directory. Let's test it out by running `mix phoenix.server`. If you visit `localhost:4000`, you'll see the correct html output, but app.css, and app.js are missing. That is because we are compiling our assets to a different directory. Lets change our `web/templates/layout/app.html.eex` to look like:

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">

    <title>Hello Myproject!</title>
    <!-- <link rel="stylesheet" href="<%= static_path(@conn, "/css/app.css") %>"> -->
  </head>

  <body>
    <div class="container">
      <header class="header">
        <nav role="navigation">
          <ul class="nav nav-pills pull-right">
            <li><a href="http://www.phoenixframework.org/docs">Get Started</a></li>
          </ul>
        </nav>
        <span class="logo"></span>
      </header>

      <p class="alert alert-info" role="alert"><%= get_flash(@conn, :info) %></p>
      <p class="alert alert-danger" role="alert"><%= get_flash(@conn, :error) %></p>

      <main role="main">
        <%= render @view_module, @view_template, assigns %>
      </main>

    </div> <!-- /container -->
    <script src="<%= static_path(@conn, "/dist/app.js") %>"></script>
  </body>
</html>
```

Notice I commented out the app.css for now. We'll get to that in the `bootstrap-loader` section. With that change, we still get an error trying to connect to `http://localhost:4000/dist/app.js`. To remedy this, we just need to add an entry for the `priv/static/dist` folder in `lib/myproject/endpoint.ex`:

```
plug Plug.Static,
  at: "/", from: :myproject, gzip: false,
  only: ~w(dist css fonts images js favicon.ico robots.txt)
```

Now, our javascript is loading. Let's modify `web/static/js/app.js` to actually do something and verify we have some nice ES6 features.

```
const project = 'Myproject';

setTimeout(() => {
  console.log(`Hello from ${project}!`);
}, 1000);
```

Back at localhost:4000, we should now see the console output: `Hello from Myproject!`. Awesome, we now have javascript compiling and running correctly, now to fix that ugly page.

## Adding a highly customizable bootstrap

Just as a note, this section was written with the [bootstrap](https://v4-alpha.getbootstrap.com/) version `v4.0.0-alpha.6` and bootstrap-loader `v2.0.0-beta.22`. The install instructions for bootstrap v3 and v4 are included in the [bootstrap-loader docs](https://github.com/shakacode/bootstrap-loader), but we will be using v4-alpha because it has flexbox support and because we enjoy hating ourselves for being flavor of the month loving front end developers. You can follow along with the install instructions for 4 there, but at the time of this writing, they support `v4.0.0-alpha.4` and we'll be making some config changes to get alpha.6 working.

So! Lets add `bootstrap-loader` and all of the dependencies it needs and a few more: `yarn add --dev bootstrap@v4.0.0-alpha.6 bootstrap-loader css-loader node-sass resolve-url-loader sass-loader style-loader url-loader imports-loader exports-loader postcss postcss-loader postcss-flexbugs-fixes autoprefixer jquery tether extract-text-webpack-plugin`.

To set up the bootstrap-loader, we need to provide a `.bootstraprc file`:

```
logLevel: debug
bootstrapVersion: 4
extractStyles: true
useFlexbox: true
styleLoaders:
  - style-loader
  - css-loader?-autoprefixer
  - resolve-url-loader?sourceMap
  - postcss-loader?sourceMap
  - sass-loader?sourceMap
preBootstrapCustomizations: ./web/static/css/pre-bootstrap-customizations.scss
bootstrapCustomizations: ./web/static/css/bootstrap-customizations.scss
appStyles: ./web/static/css/app.scss

### Bootstrap styles
styles:

  # Mixins
  mixins: true

  # Reset and dependencies
  normalize: true
  print: true

  # Core CSS
  reboot: true
  type: true
  images: true
  code: true
  grid: true
  tables: true
  forms: true
  buttons: true

  # Components
  transitions: true
  dropdown: true
  button-group: true
  input-group: true
  custom-forms: true
  nav: true
  navbar: true
  card: true
  breadcrumb: true
  pagination: true
  jumbotron: true
  alert: true
  progress: true
  media: true
  list-group: true
  responsive-embed: true
  close: true
  badge: true

  # Components w/ JavaScript
  modal: true
  tooltip: true
  popover: true
  carousel: true

  # Utility classes
  utilities: true

### Bootstrap scripts
scripts:
  alert: true
  button: true
  carousel: true
  collapse: true
  dropdown: true
  modal: true
  popover: true
  scrollspy: true
  tab: true
  tooltip: true
  util: true
```

Notice we specified a few files in this config block. Let's create those now:

`rm -rf web/static/css/*`

```
rm -rf ./web/static/css/*
touch ./web/static/css/pre-bootstrap-customizations.scss
touch ./web/static/css/bootstrap-customizations.scss
touch ./web/static/css/app.scss
```

Also, we went a little off course from the bootstrap-loader documentation with the styleLoader config:

```
styleLoaders:
  - style-loader
  - css-loader?-autoprefixer
  - resolve-url-loader?sourceMap
  - postcss-loader?sourceMap
  - sass-loader?sourceMap
```

The -autoprefixer option to the css-laoder tells it to not autoprefix any of our compiled css (which it does by default). Instead, we added the [postcss-loader](https://github.com/postcss/postcss) which can do a whoooole lot of fun things. What it does is provides a plugin system for transforming styles using javascript. You can use it to autoprefix things, or scope styles to inline react components. For our purposes, we'll use it to autoprefix our output css, and fix up some pesky flexbox issues. Let's make a `postcss.config.js` file:

This configuration was stolen from bootstraps autoprefixer config: https://github.com/twbs/bootstrap/blob/v4-dev/grunt/postcss.config.js

```
module.exports = {
  plugins: [
    require('postcss-flexbugs-fixes'),
    require('autoprefixer')({
      browsers: [
        // Stolen from: https://github.com/twbs/bootstrap/blob/v4-dev/grunt/postcss.js
        // Official browser support policy:
        // https://v4-alpha.getbootstrap.com/getting-started/browsers-devices/#supported-browsers
        //
        'Chrome >= 35', // Exact version number here is kinda arbitrary
        // Rather than using Autoprefixer's native "Firefox ESR" version specifier string,
        // we deliberately hardcode the number. This is to avoid unwittingly severely breaking the previous ESR in the event that:
        // (a) we happen to ship a new Bootstrap release soon after the release of a new ESR,
        //     such that folks haven't yet had a reasonable amount of time to upgrade; and
        // (b) the new ESR has unprefixed CSS properties/values whose absence would severely break webpages
        //     (e.g. `box-sizing`, as opposed to `background: linear-gradient(...)`).
        //     Since they've been unprefixed, Autoprefixer will stop prefixing them,
        //     thus causing them to not work in the previous ESR (where the prefixes were required).
        'Firefox >= 38', // Current Firefox Extended Support Release (ESR); https://www.mozilla.org/en-US/firefox/organizations/faq/
        // Note: Edge versions in Autoprefixer & Can I Use refer to the EdgeHTML rendering engine version,
        // NOT the Edge app version shown in Edge's "About" screen.
        // For example, at the time of writing, Edge 20 on an up-to-date system uses EdgeHTML 12.
        // See also https://github.com/Fyrd/caniuse/issues/1928
        'Edge >= 12',
        'Explorer >= 10',
        // Out of leniency, we prefix these 1 version further back than the official policy.
        'iOS >= 8',
        'Safari >= 8',
        // The following remain NOT officially supported, but we're lenient and include their prefixes to avoid severely breaking in them.
        'Android 2.3',
        'Android >= 4',
        'Opera >= 12'
      ]
    }),
  ]
}
```

Now, change the `webpack.config.js` to use bootstrap loader:

```
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: ['bootstrap-loader', './web/static/js/app.js'],
  output: {
    path: "./priv/static/dist",
    filename: "app.js"
  },
  plugins: [
    new CopyWebpackPlugin([{ from: './web/static/assets/', to: '../' }]),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery",
      Tether: "tether",
      "window.Tether": "tether",
      Alert: "exports-loader?Alert!bootstrap/js/dist/alert",
      Button: "exports-loader?Button!bootstrap/js/dist/button",
      Carousel: "exports-loader?Carousel!bootstrap/js/dist/carousel",
      Collapse: "exports-loader?Collapse!bootstrap/js/dist/collapse",
      Dropdown: "exports-loader?Dropdown!bootstrap/js/dist/dropdown",
      Modal: "exports-loader?Modal!bootstrap/js/dist/modal",
      Popover: "exports-loader?Popover!bootstrap/js/dist/popover",
      Scrollspy: "exports-loader?Scrollspy!bootstrap/js/dist/scrollspy",
      Tab: "exports-loader?Tab!bootstrap/js/dist/tab",
      Tooltip: "exports-loader?Tooltip!bootstrap/js/dist/tooltip",
      Util: "exports-loader?Util!bootstrap/js/dist/util",
    }),
    new ExtractTextPlugin({ filename: 'app.css', allChunks: true }),
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
      { test: /bootstrap[\/\\]dist[\/\\]js[\/\\]umd[\/\\]/, loader: 'imports-loader?jQuery=jquery' },
      { test: /\.(woff2?|svg)$/, loader: 'url-loader?limit=10000' },
      { test: /\.(ttf|eot)$/, loader: 'file-loader' },
    ],
  }
};
```

A lot went on there. The most important parts to note are:
- We added a new entry-point, which tells `webpack` to include `bootstrap-loader` in our entry point.
- We added a `ProvidePlugin` which provides the bootstrap libraries to our javascript as globals. Bootstrap 4 requires `jquery` and `tether` as dependencies, so we attach those to global scope.
- Finally, we added some loaders for assets that bootstrap cares about.

Don't worry, the self-loathing from webpack configuration hell will pass soon.

Let's try everything out now with `mix phoenix.server`.

Change up our `web/templates/layout/app.html.eex` to include the new css:

```
<link rel="stylesheet" href="<%= static_path(@conn, "/dist/app.css") %>">
```

And viola! We now have our app running with our customized bootstrap configurations! It still looks pretty bad beacuse of the v3 to v4 changes, so let's fix that up.

Replace the body `web/templates/layout/app.html.eex` with:

```
<body>
  <nav class="navbar navbar-toggleable-sm navbar-inverse bg-primary mb-3">
    <div class="container">
      <button class="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <%= link "Myproject", to: page_path(@conn, :index), class: "navbar-brand" %>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav ml-auto">
          <li><a href="/" class="nav-link">Button</a></li>
        </ul>
      </div>
    </div>
  </nav>
  <div class="container">
    <%= show_flash(@conn) %>
    <main role="main">
      <div class="jumbotron text-center">
        <h2>Welcome to Myproject!</h2>
        <p class="lead">Give me all of your monies pls</p>
      </div>
      <h3>Application colors</h3>
      <div class="mt-3 d-flex flex-wrap justify-content-center align-items-center">
        <button type="button" class="btn m-3 btn-primary">Primary</button>
        <button type="button" class="btn m-3 btn-secondary">Secondary</button>
        <button type="button" class="btn m-3 btn-success">Success</button>
        <button type="button" class="btn m-3 btn-info">Info</button>
        <button type="button" class="btn m-3 btn-warning">Warning</button>
        <button type="button" class="btn m-3 btn-danger">Danger</button>
        <button type="button" class="btn m-3 btn-link">Link</button>
      </div>
    </main>
  </div>
  <script src="<%= static_path(@conn, "/dist/app.js") %>"></script>
</body>
```

I made a utility function `show_flash` so the bootstrap notifications don't show when there is no message body. Modify `web/web.ex` to give us the get_flash/1 function:

```
def view do
  quote do
    use Phoenix.View, root: "web/templates"

    # Import convenience functions from controllers
    import Phoenix.Controller, only: [get_csrf_token: 0, get_flash: 2, get_flash: 1, view_module: 1]
```

and add the following to `web/views/layout_view.ex`:

```
defmodule Myproject.LayoutView do
  use Myproject.Web, :view

  defp render_flash(type, message) do
    ~E"""
    <div class="alert alert-<%= type %>" role="alert">
      <%= message %>
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    """
  end

  def show_flash(conn) do
    case get_flash(conn) do
      %{"info" => msg} ->
        render_flash("info", msg)
      %{"error" => msg} ->
        render_flash("danger", msg)
      _ ->
        ""
    end
  end
end
```

Since the alerts are clickable, we should initialize the click handlers for them in `web/static/js/app.js`:


```
$(".alert").alert();
```

Now, when we reload http://localhost:4000/, we should see our lovely new template in all of its autoprefixed-webpacked glory.
