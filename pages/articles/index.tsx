import { NextPage } from 'next';
import Page from '../../components/Page';
import publisher from '../../publisher.json'
import Link from 'next/link';
import { Article } from '../../types'
import { createReadableDate, sortByPublished } from '../../utils';
import { useState } from 'react';

const Articles: NextPage<{
  articles: {
    [name: string]: Article
  },
  tags: string[]
}> = ({ articles, tags }) => {
  const [selectedTags, updateSelectedTags] = useState([])

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      updateSelectedTags(selectedTags.filter((existingTag) => existingTag !== tag))
    } else {
      updateSelectedTags(selectedTags.concat(tag))
    }
  }

  return (
    <Page>
      <style jsx>{`
        .tags {
          display: flex;
          margin-bottom: 1rem;
        }
        .tag {
          font-size: 12px;
          background-color: #EAEAEA;
          border-radius: 3px;
          padding: 0.25rem 0.5rem;
          margin: 0 0.5rem;
          color: #666;
          cursor: pointer;
        }
        .tag.selected {
          background-color: #ED2939;
          color: #FAFAFA;
        }
        .tag:hover {
          background-color: #F0F0F0;
        }
        .tag.selected:hover {
          background-color: #ED2939;
        }
        .list {
          list-style-type: none;
          margin: 0;
          padding: 0;
        }
        .item {
          display: flex;
          padding: 1rem;
          cursor: pointer;
          align-items: center;
          font-size: 14px;
          border-radius: 3px;
        }
        .item:hover {
          background-color: #F0F0F0;
        }
        .item img {
          width: 100px;
          margin-right: 1rem;
        }
        .item h3 {
          font-size: 18px;
          margin: 0.5rem 0;
        }
        .item-details {
          display: flex;
          flex-direction: column;
        }
        .item-meta {
          display: flex;
          margin: 0.5rem 0;
        }
        .item-meta > div {
          margin-right: 1rem;
        }
        @media(max-width: 700px) {
          .item {
            flex-direction: column;
            padding: 0;
          }
          .item-details {
              width: 100%;
            }
          .item > div:first-child {
            display: none;
          }
        }
      `}</style>
      <div className="tags">
        {tags.map((tag) => (
          <div key={tag} className={`tag${selectedTags.includes(tag) ? ' selected' : ''}`} onClick={() => toggleTag(tag)}>{tag}</div>
        ))}
      </div>
      <ul className="list">
        {Object.keys(articles).sort((aName, bName) => sortByPublished(articles[aName], articles[bName])).map((name) => {
          const article = articles[name]

          if (selectedTags.length && !article.tags.reduce((aggr, tag) => aggr || selectedTags.includes(tag), false)) {
            return null
          }
          
          return (
            <Link key={name} href={`/articles/${name}`}>
              <li className="item">
                <div><img src={article.heroUrl} /></div>
                <div className="item-details">
                  <h3>{article.title}</h3>
                  <div>{article.tldr}</div>
                  <div className="item-meta">
                    <div>
                      <strong>published:</strong> {createReadableDate(article.published)}
                    </div>
                  </div>
                </div>
              </li>
            </Link>
          )
        })}
      </ul>
    </Page>
  );
}

Articles.getInitialProps = async () => {
  const tags = Object.values(publisher.articles).reduce((aggr, article) => {
    article.tags.forEach((tag) => {
      aggr.add(tag)
    })
    return aggr
  }, new Set<string>([]));
  
  return {
    tags: Array.from(tags),
    articles: publisher.articles
  }  
}


export default Articles;