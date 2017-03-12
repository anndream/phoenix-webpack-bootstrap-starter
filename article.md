Intro to Phoenix Framework, Webpack, and bootstrap-loader
=========================================================

I recently started an application in [Phoenix](http://www.phoenixframework.org/)/ Elixir after hearing an awesome talk by [Jose Valim](https://github.com/josevalim) at [Abstractions.io](http://abstractions.io/) this past year. I love the ecosystem and the `phoenix.new` process, but since I am most familiar with Webpack, I wanted to use its build process for my front end assets. Here is a link to the github repository where the final product is hosted: [TODO](github link)

## Installing phoenix

[Phoenix Install Instructions](http://www.phoenixframework.org/docs/installation)
[Up and Running Guide](http://www.phoenixframework.org/docs/up-and-running)

Once you have elixir and the phoenix mix archives installed, you can create a new project by running: `mix phoenix.new myproject`. This will create a boilerplate starter application with brunch installed by default (don't worry, it's super easy to replace). Next, `cd myproject` and run `mix ecto.create`. This will create a database for our application and assumes Postgres is installed with a postgres superuser. To edit the configs, modify
