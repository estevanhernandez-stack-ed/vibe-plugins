import React from 'react';

export interface MovieCardProps {
  title: string;
  rating: number;
  posterUrl: string;
}

export function MovieCard({ title, rating, posterUrl }: MovieCardProps): JSX.Element {
  const ratingClass = rating >= 80 ? 'rating-high' : 'rating-low';
  return (
    <article className="movie-card">
      <img src={posterUrl} alt={`Poster for ${title}`} />
      <h2>{title}</h2>
      <span className={ratingClass}>{rating}</span>
    </article>
  );
}

export default MovieCard;
