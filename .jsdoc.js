const packageJson = require('./package.json');

module.exports = {
  source: {
    include: ['./src'],
    includePattern: '.js$',
  },
  plugins: ['docdash/nativeTypesPlugin', 'plugins/markdown'],
  templates: {
    cleverLinks: true,
    default: {
      includeDate: false,
    },
  },
  opts: {
    recurse: true,
    destination: './docs',
    readme: 'README.md',
    template: 'node_modules/docdash',
  },
  docdash: {
    title: packageJson.name,
    meta: {
      title: `${packageJson.name} docs`,
    },
    sectionOrder: [],
    collapse: true,
    refLinks: [
      {
        title: 'View the package on Yarn',
        url: `https://yarnpkg.com/package/${packageJson.name}`,
        type: 'yarn',
      },
      {
        title: 'Go to the GitHub repository',
        url: `https://github.com/${packageJson.repository}`,
        type: 'github',
      },
      {
        title: 'View the package on NPM',
        url: `https://www.npmjs.com/package/${packageJson.name}`,
        type: 'npm',
      },
    ],
  },
};
