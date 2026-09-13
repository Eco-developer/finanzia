import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions'
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {}
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    config.plugins = config.plugins || [];
    config.plugins.unshift({
      apply(compiler: any) {
        compiler.hooks.normalModuleFactory.tap('StorybookNextCompatibility', (nmf: any) => {
          ['javascript/auto', 'javascript/esm', 'javascript/dynamic'].forEach((type) => {
            nmf.hooks.parser.for(type).tap('StorybookNextCompatibility', (parser: any) => {
              if (!parser.getLocation) {
                parser.getLocation = function (rangeOrExpr: any) {
                  return (rangeOrExpr && rangeOrExpr.loc) || undefined;
                };
              }
            });
          });
        });
      }
    });
    return config;
  }
};
export default config;
