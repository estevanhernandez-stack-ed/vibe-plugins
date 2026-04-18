import React from 'react';
import { MovieCard } from './components/MovieCard';
import { Quiz } from './components/Quiz';
import { BadgeManager } from './components/BadgeManager';

export function App(): JSX.Element {
  return (
    <div className="app">
      <h1>We See You At The Movies</h1>
      <MovieCard title="Dune: Part Two" rating={95} posterUrl="/posters/dune2.jpg" />
      <Quiz questionId="q1" />
      <BadgeManager userId="demo" />
    </div>
  );
}

export default App;
