import React from 'react';
import {
  Movie as MovieIcon,
  Tv as TvIcon,
  Gamepad as GamepadIcon,
  LibraryMusic as MusicIcon,
  Description as DocumentIcon,
  Apps as SoftwareIcon,
} from '@mui/icons-material';

export const getCategoryIcon = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('movie') || cat.includes('film')) return <MovieIcon />;
  if (cat.includes('tv') || cat.includes('series') || cat.includes('show'))
    return <TvIcon />;
  if (cat.includes('game') || cat.includes('gaming')) return <GamepadIcon />;
  if (cat.includes('music') || cat.includes('audio') || cat.includes('mp3'))
    return <MusicIcon />;
  if (
    cat.includes('software') ||
    cat.includes('app') ||
    cat.includes('program')
  )
    return <SoftwareIcon />;
  return <DocumentIcon />;
};

export const isVideoCategory = (category: string) => {
  const cat = category?.toLowerCase() || '';

  const isVideo =
    cat.includes('movie') ||
    cat.includes('porn') ||
    cat.includes('Other') ||
    cat.includes('film') ||
    cat.includes('tv') ||
    cat.includes('series') ||
    cat.includes('show') ||
    cat.includes('video') ||
    cat.includes('movies') ||
    cat.includes('films') ||
    cat.includes('television') ||
    cat.includes('episode') ||
    cat.includes('season') ||
    cat.includes('dvd') ||
    cat.includes('bluray') ||
    cat.includes('blu-ray') ||
    cat.includes('hdtv') ||
    cat.includes('webrip') ||
    cat.includes('web-dl') ||
    cat.includes('720p') ||
    cat.includes('1080p') ||
    cat.includes('4k') ||
    cat.includes('xvid') ||
    cat.includes('divx') ||
    cat.includes('h264') ||
    cat.includes('h.264');

  return isVideo;
};
