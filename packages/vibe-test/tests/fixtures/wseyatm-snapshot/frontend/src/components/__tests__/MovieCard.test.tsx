import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovieCard } from '../MovieCard';

describe('MovieCard', () => {
  it('renders title and rating', () => {
    render(<MovieCard title="Dune" rating={95} posterUrl="/posters/dune.jpg" />);
    expect(screen.getByText('Dune')).toBeDefined();
    expect(screen.getByText('95')).toBeDefined();
  });

  it('applies rating-high class when rating >= 80', () => {
    const { container } = render(
      <MovieCard title="X" rating={90} posterUrl="/x.jpg" />,
    );
    expect(container.querySelector('.rating-high')).not.toBeNull();
  });
});
