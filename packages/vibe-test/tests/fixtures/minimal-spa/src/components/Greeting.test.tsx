import { describe, it, expect } from 'vitest';
import { Greeting } from './Greeting.js';

describe('Greeting', () => {
  it('renders the passed name', () => {
    const element = Greeting({ name: 'World' });
    // We don't pull in @testing-library here to keep the fixture lean —
    // the scanner only needs to notice this test file exists.
    expect(element).toBeDefined();
  });
});
