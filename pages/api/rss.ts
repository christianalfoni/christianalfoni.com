import { Feed} from 'feed'
import { NextApiResponse } from "next";
import publisher from '../../publisher.json'
import { createDate, sortByPublished } from '../../utils';
import { Article } from '../../types';

const feed = new Feed({
  id: 'https://www.christianalfoni.com',
  title: 'Christian Alfoni',
  description: 'Freelance developer blog',
  link: 'https://www.christianalfoni.com',
  image: 'https://lh6.googleusercontent.com/-Am9E8NwuXuA/UuFhsL06WPI/AAAAAAAAAUo/etKU6VGmdW4/s250-no/me.jpg',
  copyright: 'All rights reserved 2019, Christian Alfoni',
  author: {
    name: 'Christian Alfoni',
    email: 'christianalfoni@gmail.com',
    link: 'https://www.christianalfoni.com'
  }
});

feed.addCategory('development');

const articles = Object.keys(publisher.articles).map((articleName) => {
  const article: Article = publisher.articles[articleName]

  return {
    data: article,
    link: 'https://www.christianalfoni.com/articles/' + articleName
  }
});

const videos = Object.keys(publisher.videos)
  .reduce((aggr, type) => aggr.concat(publisher.videos[type]), [])
  .map((video) => ({
    data: video,
    link: `https://www.youtube.com/watch?v=${video.youtubeId}`
  }))

articles.concat(videos).sort((a, b) => sortByPublished(a.data, b.data)).forEach((entity) => {
  feed.addItem({
    title: entity.data.title,
    link: entity.link,
    description: entity.data.tldr || "",
    date: createDate(entity.data.published)
  });
})

const feedString = feed.rss2();

export default (_, res: NextApiResponse) => {
  res.setHeader('Content-Type', 'application/rss+xml');
  res.statusCode = 200;
  res.end(feedString);
};
