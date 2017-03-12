Intro to Phoenix Framework, Webpack 2, and bootstrap-loader
=========================================================

I recently started an application in [Phoenix](http://www.phoenixframework.org/)/ Elixir after hearing an awesome talk by [Jose Valim](https://github.com/josevalim) at [Abstractions.io](http://abstractions.io/) this past year. I love the ecosystem and the `phoenix.new` generator, but since I am most familiar with Webpack, I wanted to use its build process for my front end assets. After looking around for some bootstrap tooling for theming, I stumbled across [bootstrap-loader](https://github.com/shakacode/bootstrap-loader) which allows you to compile bootstrap with different variables and write SASS using the bootstrap mixins.

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

Just as a note, this section was written with the bootstrap version `v4-alpha` and bootstrap-loader `v2.0.0-beta.22`. The install instructions for bootstrap v3 are included in the [bootstrap-loader docs](https://github.com/shakacode/bootstrap-loader), but we will be using v4-alpha because it has flexbox support and because we enjoy hating ourselves for being flavor of the month loving front end developers.
