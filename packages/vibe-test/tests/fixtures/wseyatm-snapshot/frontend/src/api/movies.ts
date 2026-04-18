export interface Movie {
  id: string;
  title: string;
  rating: number;
  posterUrl: string;
}

export async function listMovies(baseUrl: string = '/api'): Promise<Movie[]> {
  const res = await fetch(`${baseUrl}/movies`);
  if (!res.ok) throw new Error(`Failed to fetch movies: ${res.status}`);
  return (await res.json()) as Movie[];
}

export async function getMovie(id: string, baseUrl: string = '/api'): Promise<Movie> {
  const res = await fetch(`${baseUrl}/movies/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch movie ${id}`);
  return (await res.json()) as Movie;
}
