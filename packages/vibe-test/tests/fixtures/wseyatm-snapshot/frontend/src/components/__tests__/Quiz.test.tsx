import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Quiz } from '../Quiz';

describe('Quiz', () => {
  it('renders the prompt for a known question', () => {
    render(<Quiz questionId="q1" />);
    expect(screen.getByText(/Best Picture 2024/)).toBeDefined();
  });

  it('falls back when question id is unknown', () => {
    render(<Quiz questionId="missing" />);
    expect(screen.getByText('Unknown question')).toBeDefined();
  });
});
