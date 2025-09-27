import axios from 'axios';
import { TMDBResponse, Movie, TVShow } from '../types/tmdb';

// Route images from TMDB directly (allowed via next.config.mjs)
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p';

// Use our server-side proxy to TMDB so browsers only call our own domain
const tmdbAxios = axios.create({
  baseURL: '/api/tmdb',
  headers: {
    accept: 'application/json',
  },
});

export const getPopularMovies = async (page: number = 1): Promise<TMDBResponse> => {
  const response = await tmdbAxios.get('/movie/popular', {
    params: {
      language: 'en-US',
      page,
    },
  });
  return response.data;
};

export const getPopularTVShows = async (page: number = 1): Promise<TMDBResponse> => {
  const response = await tmdbAxios.get('/tv/popular', {
    params: {
      language: 'en-US',
      page,
    },
  });
  return response.data;
};

export const getTrendingAll = async (timeWindow: 'day' | 'week' = 'week'): Promise<TMDBResponse> => {
  const response = await tmdbAxios.get(`/trending/all/${timeWindow}`, {
    params: {
      language: 'en-US',
    },
  });
  return response.data;
};

export const searchMovies = async (query: string): Promise<TMDBResponse> => {
  const response = await tmdbAxios.get('/search/movie', {
    params: {
      query,
      page: 1,
      language: 'en-US',
    },
  });
  return response.data;
};

export const searchTVShows = async (query: string): Promise<TMDBResponse> => {
  const response = await tmdbAxios.get('/search/tv', {
    params: {
      query,
      page: 1,
      language: 'en-US',
    },
  });
  return response.data;
};

export const getPosterUrl = (path: string | null, size: 'w342' | 'w500' | 'w780' | 'original' = 'w500') => {
  return path ? `${TMDB_IMAGE_URL}/${size}${path}` : null;
};

export const getBackdropUrl = (path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280') => {
  return path ? `${TMDB_IMAGE_URL}/${size}${path}` : null;
};

// Details
export const getMovieDetails = async (id: number | string): Promise<Movie> => {
  const res = await tmdbAxios.get(`/movie/${id}`, { params: { language: 'en-US' } })
  return res.data as Movie
}

export const getTVDetails = async (id: number | string): Promise<TVShow> => {
  const res = await tmdbAxios.get(`/tv/${id}`, { params: { language: 'en-US' } })
  return res.data as TVShow
}

// Similar
export const getSimilarMovies = async (id: number | string): Promise<TMDBResponse> => {
  const res = await tmdbAxios.get(`/movie/${id}/similar`, { params: { language: 'en-US', page: 1 } })
  return res.data as TMDBResponse
}

export const getSimilarTV = async (id: number | string): Promise<TMDBResponse> => {
  const res = await tmdbAxios.get(`/tv/${id}/similar`, { params: { language: 'en-US', page: 1 } })
  return res.data as TMDBResponse
}