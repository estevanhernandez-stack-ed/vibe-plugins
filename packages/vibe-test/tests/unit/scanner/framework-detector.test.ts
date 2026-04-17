import { describe, it, expect } from 'vitest';

import { detectFrameworksPure, type PackageJsonShape } from '../../../src/scanner/framework-detector.js';

describe('framework-detector', () => {
  it('detects react + vitest + firebase from a synthetic package.json', () => {
    const pkg: PackageJsonShape = {
      name: 'demo',
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        firebase: '^10.0.0',
      },
      devDependencies: {
        vitest: '^2.1.0',
      },
    };
    const res = detectFrameworksPure(pkg, []);
    expect(res.test).toContain('vitest');
    expect(res.frontend).toContain('react');
    // firebase root dep enables auth + firestore heuristic
    expect(res.database).toContain('firestore');
    expect(res.auth).toContain('firebase-auth');
  });

  it('detects vitest from a config file even if dep is missing', () => {
    const res = detectFrameworksPure(null, ['vitest.config.ts']);
    expect(res.test).toContain('vitest');
  });

  it('detects next + tailwind-ish stack', () => {
    const pkg: PackageJsonShape = {
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      },
    };
    const res = detectFrameworksPure(pkg, ['next.config.js']);
    expect(res.frontend).toContain('next');
    expect(res.frontend).toContain('react');
  });

  it('detects express backend and @testing-library test helpers', () => {
    const pkg: PackageJsonShape = {
      dependencies: { express: '^4.18.0' },
      devDependencies: {
        jest: '^29.0.0',
        '@testing-library/react': '^14.0.0',
      },
    };
    const res = detectFrameworksPure(pkg, []);
    expect(res.backend).toContain('express');
    expect(res.test).toContain('jest');
    expect(res.test).toContain('@testing-library');
  });

  it('returns empty arrays on empty input', () => {
    const res = detectFrameworksPure(null, []);
    expect(res.test).toEqual([]);
    expect(res.frontend).toEqual([]);
    expect(res.backend).toEqual([]);
  });
});
