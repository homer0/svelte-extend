# svelte-extend

[![GitHub Workflow Status (main)](https://img.shields.io/github/actions/workflow/status/homer0/svelte-extend/test.yml?branch=main&style=flat-square)](https://github.com/homer0/svelte-extend/actions?query=workflow%3ATest)
[![Coveralls github](https://img.shields.io/coveralls/github/homer0/svelte-extend.svg?style=flat-square)](https://coveralls.io/github/homer0/svelte-extend?branch=main)
![Dependencies status](https://img.shields.io/librariesio/release/npm/svelte-extend/latest)

Create new Svelte components by extending existing ones

## Introduction

> **Disclaimer:** I'm aware that this doesn't existed for a reason, and while I consider the opinion of the author of Svelte to be valid, I needed this for a very specific case. If you are interested on using this library, I would recommend you to **think hard if you really need it**.
>
> Extending single file components is not the same as OOP inheritance, there's a lot of things that end up hidden (because there's no `class`) and your IDE (unless someone integrates this on an IDE :P) won't be able to warn you about.

This library introduces an `extend` HTML tag that you'll be able to use on your `.svelte` files in order to indicate that the component you are creating extends from another one:

```html
<extend from="./base-component.svelte" />
<strong>My new component</strong>
```

## Usage

As shown on the introduction snippet, you can reference a base component using the `extend` tag and then add custom markup to it.

By default, an extended component will only take the `script` and `style` tags from the base component and use its own markup (HTML)... but you can change all of that.

### HTML

If you want to also bring the HTML from the base component, you just need to add the `html` attribute to the tag:

```html
<extend from="./base-component.svelte" html />
<strong>My new component</strong>
```

Now, the generated component will have first the base component HTML and then the one you added.

If you would want to do it the other way around, first the extended HTML and then the one from the base component, you just need to set the value of the `html` attribute to `before`

```html
<extend from="./base-component.svelte" html="before" />
<strong>My new component</strong>
```

### Scripts

By default, if the extended component doesn't have a `script` tag, the generated component will have the ones from the base; but if you want to overwrite it, you just need to create it:

```html
<extend from="./base-component.svelte" html="before" />
<script>
  // ...
</script>
<strong>My new component</strong>
```

Done, if the base one had a `script` tag, it won't be included on the generated component.

Now, what if you want to add variables or change the way function works from the base component? Well, you can add a `extend` attribute to the extended `script` tag:

```html
<extend from="./base-component.svelte" html="before" />
<script extend>
  // ...
</script>
<strong>My new component</strong>
```

The library will put the contents of the base `script` tag first, then the contents of the `extended` tag and parse & format the code to remove duplicated declarations, and move all the `import`/`require` statements to the top.

> **NOTE:** This applies for both, regular `script` tags and `script` tags with the `context="module"` attribute.

### Styles

These works in way that is like a mix of scripts and markup: By default, if the extended component doesn't have a `style` tag, the generated component will have the one from the base; but if you want to overwrite it, like for scripts, you just need to create it:

```html
<extend from="./base-component.svelte" html="before" />
<style>
  /**
   * ...
   */
</style>
<strong>My new component</strong>
```

By creating it, you are telling the library that even if the base component has a `style` tag, you want to use the one from the extended component.

And yes, you can extend it by adding a `extend` attribute:

```html
<extend from="./base-component.svelte" html="before" />
<style extend>
  /**
   * ...
   */
</style>
<strong>My new component</strong>
```

But this attribute works like the one for HTML, you can set the position in which you want to add the base styling:

```html
<extend from="./base-component.svelte" html="before" />
<style extend="before">
  /**
   * ...
   */
</style>
<strong>My new component</strong>
```

Now the extended code will come before the one from the base component.

## Integrations

Everything is great, but you are probably wondering how do you add it to a project.

### webpack

The library includes a webpack loader that you can add to your configuration:

```js
{
  test: /\.svelte$/i,
  use: [
    // The official one, to actually compile the `.svelte` files.
    {
      loader: 'svelte-loader',
      options: { ... },
    },
    // The one for `svelte-extend`
    {
      loader: 'svelte-extend/webpack',
      options: {
        allowedMaxDepth: 0, // No limit.
      },
    },
  ],
}
```

#### Options

- `allowedMaxDepth`: By default, the library allows you to also extend from already extended components, but if you want to limit how much "levels" a component could extend from, you can use this parameter. The default value is `0`, meaning it has no limit.

#### Example

You can find an example project on the [`examples/webpack`](https://github.com/homer0/svelte-extend/examples/webpack) folder.

### Rollup

The library also includes a Rollup plugin:

```js
const svelteExtend = require('svelte-extend/rollup');
...

module.exports = {
  ...
  plugins: [
    ...,
    /**
     * The one for `svelte-extend`: it needs to go before the official one because
     * it parses the template as `.svelte` files and not as the actual `.js` the
     * Svelte compiler produces.
     */
    svelteExtend({
      include: [], // Files to include.
      exclude: [], // Files to exclude.
      allowedMaxDepth: 0, // No limit.
    });
    // The official one, to actually compile the `.svelte` files.
    svelte({ ... }),
  ],
};
```

#### Options

- `include` & `exclude`: The basic options for almost all Rollup plugins, to define which files should and shouldn't be processed by a plugin.
- `allowedMaxDepth`: By default, the library allows you to also extend from already extended components, but if you want to limit how much "levels" a component could extend from, you can use this parameter. The default value is `0`, meaning it has no limit.

#### Example

You can find an example project on the [`examples/rollup`](https://github.com/homer0/svelte-extend/examples/rollup) folder.

## Development

### NPM tasks

| Task       | Description                         |
|------------|-------------------------------------|
| `test`     | Run the project unit tests.         |
| `lint`     | Lint the modified files.            |
| `lint:all` | Lint the entire project code.       |
| `docs`     | Generate the project documentation. |
| `todo`     | List all the pending to-do's.       |

### Repository hooks

I use [`husky`](https://www.npmjs.com/package/husky) to automatically install the repository hooks so...

1. The code will be formatted and linted before any commit.
2. The dependencies will be updated after every merge.
3. The tests will run before pushing.

#### Commits convention

I use [conventional commits](https://www.conventionalcommits.org) with [`commitlint`](https://commitlint.js.org) in order to support semantic releases. The one that sets it up is actually husky, that installs a script that runs `commitlint` on the `git commit` command.

The configuration is on the `commitlint` property of the `package.json`.

### Releases

I use [`semantic-release`](https://www.npmjs.com/package/semantic-release) and a GitHub action to automatically release on NPM everything that gets merged to main.

The configuration for `semantic-release` is on `./releaserc` and the workflow for the release is on `./.github/workflow/release.yml`.

### Testing

I use [Jest](https://facebook.github.io/jest/) to test the project.

The configuration file is on `./.jestrc.js`, the tests are on `./tests` and the script that runs it is on `./utils/scripts/test`.

### Code linting and formatting

For linting, I use [ESlint](https://eslint.org) with [my own custom configuration](https://www.npmjs.com/package/@homer0/eslint-plugin); there are two configuration files, `./.eslintrc` for the source and the tooling, and `./tests/.eslintrc`, and there's also a `./.eslintignore` to exclude some files.

And for formatting, I use [Prettier](https://prettier.io) with [my JSDoc plugin](https://www.npmjs.com/package/@homer0/prettier-plugin-jsdoc) and [my own custom configuration](https://www.npmjs.com/package/@homer0/prettier-config). The configuration file is `./.prettierrc`.

The script that runs them is `./utils/scripts/lint`; the script `lint-all` only runs ESLint, and runs it for the entire project.

### Documentation

I use [JSDoc](https://jsdoc.app) to generate an HTML documentation site for the project.

The configuration file is on `./.jsdoc.js` and the script that runs it is on `./utils/scripts/docs`.

### To-Dos

I use `@todo` comments to write all the pending improvements and fixes, and [Leasot](https://yarnpkg.com/en/package/leasot) to generate a report. The script that runs it is on `./utils/scripts/todo`.
