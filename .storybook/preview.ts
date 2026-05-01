import type { Preview } from '@storybook/svelte-vite';
import { themes } from 'storybook/theming';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    docs: {
      theme: themes.dark,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // 'todo' lists violations without failing the run; switch to 'error' once the story set is clean.
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
