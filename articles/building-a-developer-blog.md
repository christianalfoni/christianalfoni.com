[Next JS version 9]() was just released. With me going 100% freelance it opened up a great opportunity to do another iteration on my blog. My previous iteration was really about server side rendering, deploying on [Heroku]() and creating a markdown converter called [marksy](), which also powers this site. 

With version 9 of Next JS I got the stuff I want. Things like dynamic routing, Typescript support and other general improvements. I was super excited to see how little work it required to get my blog up and running.

And so my journey began:

```sh
npm install react react-dom marksy @types/react @types/node 
```

## Rendering markdown from a file

What I first wanted to know is if I was able to create markdown files and produce an article output. I really enjoy using markdown when writing articles and with Marksy I am able to enhance my markdown with custom components.

First I created my article page with **dynamic routing** at `/pages/articles/[name].tsx`.

```tsx
import { NextPage } from 'next';
import marksy from 'marksy'
import { createElement } from 'react';

// 1. We create our marksy instance using the
// element factory from React
const compile = marksy({ createElement })
```

```tsx
const Article: NextPage<{ article: string }> = ({ article }) => {
  // 3. Here we get the article as a string and we compile it into
  // virtual dom
  return (
    <div>
      {compile(article).tree}
    </div>
  )
}
```

```tsx
// 2. When Next prepares the component we go
// grab the markdown based on the name query
Article.getInitialProps = async ({ query }) => {
  const article = await import(`../../articles/${query.name}.md`)

  return {
    article: article.default,
  }
}

export default Article;
```

Now running the **Next** development flow and hitting `http://localhost:3000/articles/some-article` grabs and shows the converted markdown located in `articles/some-article.md`. Great! My proof of concept was done and I could continue building up my blog.

```marksy
h(Notice, null, "By default Next does not handle **.md** files. With a [quick webpack configuration](https://stackoverflow.com/questions/47954367/import-markdown-files-as-strings-in-next-js) you get it up and running though.")
```

## Code highlighting

An important feature of a developer blog is code highlighting. Marksy has en option to use any highlighter, where [Prism.js](https://prismjs.com/) is currently my favourite. The reason simply being that it handles Typescript. The highlighting is implemented simply as:

```ts
import { NextPage } from 'next';
import marksy from 'marksy'
import { createElement } from 'react';
import Prism from 'prismjs'

// 1. We create our marksy instance using the
// element factory from React
const compile = marksy({
  createElement,
  highlight(language, code) { 
    return Prism.highlight(code, Prism.languages.javascript, language);
  },
})
```

Now I am able to write markdown code examples with whatever language I have activated in my [Prism.js babel preset](https://www.npmjs.com/package/babel-plugin-prismjs). You simply just install it an add a **.babelrc** file to your project, where mine looks like:

```js
{
  "presets": ["next/babel"],
  "plugins": [
    ["prismjs", {
        "languages": ["javascript", "typescript", "jsx", "markup", "tsx"],
    }]
  ]
}
```

```marksy
h(Notice, null, "**Next** has its own css-in-js solution and if you are using that make sure you use the global style approach documented [here](https://nextjs.org/blog/styling-next-with-styled-jsx#adding-global-styles).")
```

## Publishing Management

What I needed to decide upon is how publishing should work. Having a bunch of markdown files in a folder is not enough. I would have to manage the following:

- Is the article **published** or not? So that I can work on drafts, but still deploy changes to the blog
- **When** is the article published? So that I can have an archive and show the latest article
- How do I define title, tags, tldr and other **meta data**? So that I can show details about the article, without loading the whole thing

Being a developer I can just deploy a new site whenever I want to update the contents of it, meaning all I really need is a file where I define this meta data. And here it is, **publisher.json**:

```ts
{
  "articles": {
    "building-a-developer-blog": {
      "title": "Building a developer blog with Next JS",
      "tldr": "I have been waiting for an opportunity to combine looking into new technology and building a new blog. Next JS version 9 was this opportunity. Let me tell you about it!",
      "published": "10.02.2019",
      "tags": ["typescript", "next", "marksy"],
      "heroUrl": "https://www.elegantthemes.com/blog/wp-content/uploads/2019/04/000-Comment-Your-Code.png"
    }
  }
}
```

The great thing is that if I do not add my article to this file I can still open it is a draft during development. This file also allows me to define other publishing data, like what [ko-fi](https://www.ko-fi.com/christianalfoni) video updates I want to add, and really whatever my heart would desire.

```tsx
import { NextPage } from 'next';
import marksy from 'marksy'
import { createElement } from 'react';
// 1. By default you can import JSON files
import publisher from '../../publisher.json'
```

```tsx
Article.getInitialProps = async ({ query }) => {
  const article = await import(`../../articles/${query.name}.md`)
  // 2. We grab the publishing details of the article requested
  const publishingDetails = publisher.articles[query.name.toString()];

  return {
    article: article.default,
    publishingDetails
  }
}

export default Article;
```

## RSS Feed

For people interested in your content it is nice to provide an RSS api. You can very easily build this api endpoint using the new **api routes**. All we have to do is create a file named `pages/api/rss.ts`, install the [feed](https://www.npmjs.com/package/feed) package and insert something like the following code:

```ts
import { Feed} from 'feed'
import { NextApiResponse } from "next";
import publisher from '../../publisher.json'
import { createDate } from '../../utils';
import { Article } from '../../types';

// 1. We define a new feed
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

// 2. We give it a category
feed.addCategory('development');

// 3. We add the published articles
Object.keys(publisher.articles).forEach((articleName) => {
  const article: Article = publisher.articles[articleName]

  feed.addItem({
    title: article.title,
    link: 'https://www.christianalfoni.com/articles/' + articleName,
    description: article.tldr,
    date: createDate(article.published)
  });
});

// 4. We create the result to be used on any requests for it,
// as it does not change during the lifespan of the application instance
const feedString = feed.rss2();

// 5. We return the rss string
export default (_, res: NextApiResponse) => {
  res.setHeader('Content-Type', 'application/rss+xml');
  res.statusCode = 200;
  res.end(feedString);
};

```

Now you can create links taking the user to `/api/rss` where you will get an RSS result to be used with any RSS reader.

## Automatic deploy

The great thing about **Next** is that it can be integrated with Github using the [Now Github Integration](https://zeit.co/github). That means you deploy a new version of your site when pushing to the repo. Follow these steps:

- Create an account on [zeit.co](https://zeit.co)
- Create a Github repo
- Install the [Now Github Integration](https://zeit.co/github)
- Configure your `next.config.js` file with **serverless**

```js
{
  target: 'serverless',
}
```

- Create a `now.json` file with an alias.

```js
{
  "version": 2,
  "builds": [{ "src": "package.json", "use": "@now/next" }],
  "alias": "{yourblogname}.now.sh"
}
```
- Push to the `master` branch
- Go to your [dashboard on zeit.co](https://zeit.co/dashboard)
- Click the latest release and go to the **domains** tab at the top to add a new production domain
- Push a new version of your blog to `master`

## Designing A Blog

Now, I am no designer. To get anything to look pretty okay I need to look at existing solutions and just steal as much as I can. What I have learned though is that small things like paddings and margins is the key to get a good feel for a site. I checked out [this talk](https://www.youtube.com/watch?v=F4G2i4eS7x0&t=554s) on how developers can get some insight into creating an okay design. As you can see I am stealing shamelessly from the examples there. Here is a short summary of what I did:

- **Choose two font families** from Google. Search the web for good combinations. There are several articles rating font combinations.
- **Line length** of text should be no longer than **700**px. This is just a fact. People loose track of which line they are on if any longer than that.
- **Line height** gives breathing space and it should be between **1.4** and **1.8**. That is just how it is.
- **General spacing** with margins and paddings needs to be consistent. Use [rems]() to ensure this. I only use **0.5**rem, **1**rem, **1.5**rem etc. 
- **Keep articles interesting** by not having too big paragraphs. Make sure you split up in multiple paragraphs, separate with new headers and code examples. 

## Summary

I hope this gave you some insight into how **Next** works and how you can quickly and easily get a custom built developer blog up and running. If you have any questions please do not hesitate to contact me or look into the source code of this blog, it is [open source on Github](https://github.com/christianalfoni/christianalfoni.com). Thanks for reading!