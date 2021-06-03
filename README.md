# generator-projectsetup

A yeoman generator to set up projects based on a remote config. The config will be hosted and maintained separately in another git repository. That means you don't need to stick to a single purpose generator and can create a customized one based on your needs.

## Generator

The projectsetup generator depends on the `yeoman-generator` in version 4.x. Read the [API documentation for v4.x](https://yeoman.github.io/generator/4.x/) for supported features.

## Installation

At first, you need to install [yeoman](https://yeoman.io/learning/index.html).

```bash
npm install -g yo
```

Then install the projectsetup generator.

```bash
npm install -g generator-projectsetup
```

## Usage

Create a directory for your new app.

```bash
mkdir my-new-project
cd my-new-project/
```

Generate your project and follow the prompts from your config.

```bash
yo projectsetup
```

### Options

You can pass options into the generator. These are the existing options:

| option | description |
|--------|-------------|
| `--dir [/path/to/config]` | Use this option to bypass the checkout process of the remote config and use a local version from your file system. |
| `--branch [name]` | Set the branch that should be used instead of `main`. |




## Configuration

A configuration is located in a git repository. To run the projectsetup generator, each remote config needs a `projectsetup.config.js` file. This is the entry point for the generator. It contains the settings for `tasks` and `routes` that describes a project setup. The outline of the config file looks like this:

```javascript
module.exports = {
  tasks: [ /* define tasks here */ ],
  routes: { /* define routes here */ },
};
```

### Tasks

A task is described using an object which needs at least a unique `key` and a `name` value. The `key` will be used to reference a task within the `routes` later on. The `name` will be used as displayable choices by the user who's executing the generator.

A task basically only makes sense when it contains some executable code. This code can be defined in an `entry`. An `entry` is a javascript file relatively to the config file, that exposes asynchronous functions as hooks. These hooks are `beforeAll`, `run` and `afterAll`.

```javascript
module.exports.beforeAll = async (params) => {
  /* implement hook */
};

module.exports.run = async (params) => {
  /* implement hook */
};

module.exports.afterAll = async (params) => {
  /* implement hook */
};
```

The generator will call these functions (if defined) by each task that is relevant depending on the route of the user decisions. The properties of the params object, that is passed into each function call are:

| property    | description |
|-------------|-------------|
| `config`    | The merged configuration, based on the user answers of all tasks. |
| `generator` | The reference to the yeoman generator. This instance contains the yeoman [api functions](https://yeoman.github.io/generator/4.x/) that can be used to implement the custom code for each task. |
| `dir`       | The location where the config code is located after a git clone. |
| `task`      | The corresponding task definition form the config file. |
| `todos`     | The list of task definitions based on the route of decisions. |

Each task can additionally prompt the user for more input that is required to fulfill the task or to customize the output. The input will be received in each hook using the `config` property (see definition above). To prompt the user for input, the generator uses [inquirer](https://www.npmjs.com/package/inquirer) and supports all available [prompt types](https://www.npmjs.com/package/inquirer#prompt-types) that are defined in the `questions` property.

A task entry can use external dependencies that will be downloaded and installed during the startup of a config. If a repository contains a `package.json` and has dependencies listed (not dev dependencies), then the generator will install these and they will be importable in your code.

The `tasks` array inside the config file contains all task definitions. Dependencies of different tasks are described in the `routes` object. An example tasks definition can look like this:

```javascript
module.exports = {
  tasks = [
    {
      key: 'meal',
      name: 'Order a meal',
      entry: './tasks/meal.js',
      questions: [
        {
          type: 'list',
          name: 'foodGenre',
          message: 'Where to order?',
          choices: ['salat', 'pizza', 'burger', 'sushi'],
          default: 'salat',
        },
      ],
    },
    {
      key: 'drink',
      name: 'Order a drink',
      entry: './tasks/drink.js',
    },
    {
      key: 'soft-drink',
      name: 'Soft drink',
      entry: './tasks/soft-drink.js',
      questions: [
        {
          type: 'checkbox',
          name: 'softDrink',
          message: 'Which soft drink?',
          choices: ['coke', 'limo', 'soda', 'energy'],
        },
      ],
    },
    {
      key: 'alcoholic-drink',
      name: 'With alcohol',
      entry: './tasks/alcoholic-drink.js',
      questions: [
        {
          type: 'list',
          name: 'alcoholicDrink',
          message: 'Which alcohol drink?',
          choices: ['rum', 'wodka', 'gin', 'whisky'],
        },
        {
          type: 'confirm',
          name: 'withCocktailUmbrella',
          message: 'Add a cocktail umbrella?',
          default: true,
        },
      ],
    },
    {
      key: 'fruits',
      name: 'Fruits',
      entry: './tasks/fruits.js',
    },
  ],

  routes: { /* defined routes in the "routes" section */ },
};
```

### Routes

The `routes` object describes the decision tree, that the user can travel along. Each object is defined using a `message` and a "handler". There are currently these handlers available:

* `oneOf` - "single choice" implementation. The user needs to select one entry.
* `manyOf` - "multiple choice" implementation. The user can select more than one entry.

An entry of these handlers uses a `key` property to refer to a task definition. The value must match with a `key` property value of an existing task. To nest a route and create a tree, this object takes a new `routes` property and creates a recursive object structure. An example routes definition can look like this:

```javascript
module.exports = {
  tasks = [ /* defined tasks from the section above */ ],

  routes: {
    message: 'What to order',
    oneOf: [
      {
        key: 'meal',
      },
      {
        key: 'drink',
        routes: {
          message: 'What kind of drink',
          oneOf: [
            {
              key: 'soft-drink',
            },
            {
              key: 'alcoholic-drink',
              routes: {
                message: 'Mix it with',
                manyOf: [
                  {
                    key: 'soft-drink'
                  },
                  {
                    key: 'fruits',
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};
```

## Development

Install using:
```
git clone git@github.com:schorfES/generator-projectsetup.git
nvm install
npm install
npm link
```

Run locally linked generator:

```
yo projectsetup "git@github.com:your-username/your-projectconfig.git"
```

Run the generator without cloning a remote repo:

```
yo projectsetup --dir /path/to/local/config
```

## License

Copyright (c) 2020

Licensed under the [MIT license](LICENSE).
