import { NextPage } from 'next';
import marksy from 'marksy'
import { createElement } from 'react';
import Prism from 'prismjs'
import Page from '../../components/Page';
import publisher from '../../publisher.json'
import { createReadableDate } from '../../utils';

const Notice: React.FunctionComponent = ({ children }) => {
  return (
    <div className="notice">
      {compile(children[0]).tree}
    </div>
  )
}

const compile = marksy({
  createElement,
  highlight(language, code) { 
    return Prism.highlight(code, Prism.languages.javascript, language);
  },
  components: {
    Notice
  }
})

const Article: NextPage<{
  article: string,
  publishingDetails: {
    title: string
    published: string
    tags: string[]
    heroUrl: string
    tldr: string
  }
}> = ({ article, publishingDetails }) => {
  return (
    <Page>
      <article className="article">
        <style jsx global>{`
          .article h1, .article h2, .article h3, .article h4 {
            font-family: 'Palanquin', sans-serif;
            font-weight: 700;
            text-transform: capitalize;
            margin: 2rem 0.5rem 1rem 0.5rem;
          }
          .article h1 {
            text-align: center;
            color: #FAFAFA;
            width: 600px;
            margin: 1rem auto;
            text-transform: uppercase;
            font-size: 48px;
            padding: 0 1rem;
          }
          .article p {
            line-height: 1.8;
            font-size: 18px;
            margin: 1rem 0.5rem;
          }
          .article a {
            color: #ED2939;
            text-decoration: none;
          }
          .article p code {
            background-color: #EAEAEA;
            font-size: 16px;
            padding: 0.25rem;
            border-radius: 2px;
            font-family: Consolas,Menlo,Monaco,source-code-pro,Courier New,monospace;
          }
          .article pre {
            background-color: rgb(30,30,40);
            border-radius: 5px;
            font-family: Consolas,Menlo,Monaco,source-code-pro,Courier New,monospace;
            padding: 2rem;
            color: #FAFAFA;
            font-size: 13.6px;
            overflow-x: scroll;
          }
          .article .punctuation {
            color: #FAFAFAFA;
          }
          .article .keyword, .article .tag {
            color: rgb(240, 105, 185);
          }
          .article .string {
            color: rgb(235, 240, 130);
          }
          .article .function {
            color: rgb(75, 225, 105);
          }
          .article .builtin, .article .boolean {
            color: rgb(130, 210, 230);
          }
          .article .comment {
            color: rgb(105, 105, 120);
          }
          .article li {
            margin-bottom: 1.5rem;
          }
          .article ul {
            margin: 2rem 0;
          }
          .article .notice {
            border-left: 3px solid #ED2939;
            background-color: #FFF;
            padding: 0.5rem 1rem;
            border-radius: 3px;
          }
          .article .notice p {
          font-size: 16px; 
          line-height: 1.4;
          }
        `}</style>
        <style jsx>{`
          .hero {
            position: relative;
            padding: 2rem;
            margin: 6rem 0;
            border-radius: 5px;
            background-color: #333;
            height: 275px;
          }
          .hero-background {
            position: absolute;
            opacity: 0.25;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 0;
          }
          .hero-content {
            z-index: 1;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .hero-date {
            text-align: center;
            font-style: italic;
            font-size: 18px;
            text-transform: uppercase;
            margin-bottom: 1rem;
            color: #FAFAFA;
          }
          .hero-publisher {
            position: absolute;
            bottom: -40px;
            border-radius: 50%;
            left: calc(50% - 40px);
            width: 80px;
            height: 80px;
            background-image: url("/static/chris.jpeg");
            background-size: cover;
            border: 4px solid #FAFAFA;
            text-align: center;
            white-space: nowrap;
            box-sizing: border-box;
            
          }
          .hero-publisher span {
            position: absolute;
            color: #ED2939;
            bottom: -1.5rem;
            left: -40px;
            width: 160px;
            text-align: center;
          }
          .tags {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 1rem;
          }
          .tags div {
            border-radius: 3px;
            background-color: #ED2939;
            padding: 0.25rem 0.5rem;
            margin: 0 1rem;
            color: #FAFAFA;
            font-size: 12px;
            text-transform: uppercase;
          }
          .tldr {
            font-size: 28px; 
            color: #555;
            margin: 2rem;

          }
          .tldr::first-letter {
            color: #333;
            float: left;
            font-size: 84px;
            line-height: 60px;
            padding-top: 10px;
            padding-right: 8px;
            padding-left: 3px;
          }
          .content {
            margin: 3rem 0;
          }
          @media(max-width: 700px) {
            .hero {
              margin-top: 0;
            }
            .article h1 {
              font-size: 18px;
              width: auto;
            }
          }
        `}</style>
        <div className="hero">
          <div className="hero-background" style={{
            backgroundImage: `url(${publishingDetails.heroUrl})`
          }}/>
          <div className="hero-content">
            <h1>{publishingDetails.title}</h1>
                    <div className="tags">
              {publishingDetails.tags.map((tag) =>(
                <div key={tag}>
                  {tag}
                </div>
              ))}
            </div>
            <div className="hero-date">
              {createReadableDate(publishingDetails.published)}
            </div>
            <div className="hero-publisher">
              <span>by Christian Alfoni</span>
            </div>
          </div>
        </div>
        <div className="tldr">
          {publishingDetails.tldr}
        </div>
        <div className="content">
          {compile(article).tree}
        </div>
      </article>
    </Page>
  )
}

Article.getInitialProps = async ({ query }) => {
  const article = await import(`../../articles/${query.name}.md`)
  const publishingDetails = publisher.articles[query.name.toString()];


  return {
    article: article.default,
    publishingDetails,
  }
}

export default Article;