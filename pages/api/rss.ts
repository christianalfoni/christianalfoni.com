import { Feed} from 'feed'
import { NextApiResponse } from "next";
import publisher from '../../publisher.json'
import { createDate } from '../../utils';
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

Object.keys(publisher.articles).forEach((articleName) => {
  const article: Article = publisher.articles[articleName]

  feed.addItem({
    title: article.title,
    link: 'https://www.christianalfoni.com/articles/' + articleName,
    description: article.tldr,
    date: createDate(article.published)
  });
});

const feedString = feed.rss2();

export default (_, res: NextApiResponse) => {
  res.setHeader('Content-Type', 'application/rss+xml');
  res.statusCode = 200;
  res.end(feedString);
};
