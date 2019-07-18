export type Article = {
  title: string,
  tldr: string,
  published: string,
  tags: string[],
  heroUrl: string
}

export type Video = {
  title: string
  youtubeId: string
  published: string
  duration: string
}