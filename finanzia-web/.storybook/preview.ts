import type { Preview } from '@storybook/react';
import '../src/presentation/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0B0F19' },
        { name: 'surface', value: '#111827' },
        { name: 'light', value: '#F9FAFB' }
      ]
    }
  }
};

export default preview;
