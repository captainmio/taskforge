import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('frontend test environment', () => {
  it('renders React components with jest-dom matchers', () => {
    render(<button disabled>Test environment ready</button>);

    expect(
      screen.getByRole('button', { name: 'Test environment ready' }),
    ).toBeDisabled();
  });
});
