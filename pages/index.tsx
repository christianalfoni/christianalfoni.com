import { NextPage } from 'next';
import Page from '../components/Page';
import publisher from '../publisher.json'
import Link from 'next/link';
import { FaRss } from 'react-icons/fa'

const Card: React.FunctionComponent<{
  heroUrl: string
  title: string
  description: string
  url: string
}> = ({ url, title, heroUrl, description }) => {
  return (
      <Link href={url}>
        <a className="card" target={url.startsWith('http') ? '_blank' : null}>
          <style jsx>{`
          .card {
            margin: 1rem;
            width: 300px;
            position: relative;
            cursor: pointer;
            color: #333;
            text-decoration: none;
          }
          .hero {
            height: 100px;
            border-radius: 3px;
            background-size: cover;
          }
          .card h2 {
            font-size: 18px;
            font-weight: 700;
            margin: 0.5rem 0;
            display: block;
            height: 50px;
            display: flex;
            align-items: center;
          }
          .description {
            font-size: 12px;
          }
        `}</style>

        <div className="hero" style={{
          backgroundImage: `url("${heroUrl}")`
        }}/>

        <h2>{title}</h2>

        <div className="description">
          {description}
        </div>
      </a>
    </Link>
  )
}

const Index: NextPage<{
  lastArticle: {
    title: string
    heroUrl: string
    name: string
    tldr: string
  },
  lastKofi: {
    title: string
    youtubeId: string
  }
}> = ({ lastArticle, lastKofi }) => {
  return (
    <Page>
      <style jsx>{`
        .cards {
          display: flex;
          flex-direction: column;
        }
        .cards-row {
          display: flex;
        }
        .other-row {
          display: flex;
          padding: 1rem;
        }
        .other-row h4 {
          text-transform: uppercase;
          color: #ED2939;
          margin-bottom: 0;
        }
        .other-row a {
          opacity: 0.75;
          transition: opacity 0.25s ease-in;
          color: #333;
          text-decoration: none;
          display: block;
        }
        .other-row a:hover {
          opacity: 1;
        }
        .other-row ul {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
        .other-row li {
          margin: 0.25rem 0;
        }
        .other-column {
          display: flex;
          flex: 1;
          flex-direction: column;
        }
        .rss-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .other-row  a.rss {
          opacity: 1;
          cursor: pointer;
          margin: 3rem;
          width: 150px;
          height: 150px;
          display: flex;
          flex-direction: column;
          text-align: center;
          align-items: center;
          justify-content: space-around;
          color: #FAFAFA;
          background-color: rgb(235, 130, 22);
          border-radius: 5px;
        }
        @media(max-width: 700px) {
          .cards-row, .other-row {
            flex-direction: column;
          }
          .other-row  a.rss {
            display: none;
          }
        }
      `}</style>
      <div className="cards">
        <div className="cards-row">
          <Card
            heroUrl={lastArticle.heroUrl}
            title={lastArticle.title}
            description={lastArticle.tldr}
            url={`/articles/${lastArticle.name}`}
          />
          <Card
            heroUrl="/static/logo.jpg"
            title={lastKofi.title}
            description="Ko-fi is a weekly video where I talk about what I have been up to. The content ranges from freelancing, to new tools and ranting about stuff."
            url={`https://www.youtube.com/watch?v=${lastKofi.youtubeId}`}
          />
        </div>
        <div className="cards-row">
          <Card
            heroUrl="https://cerebraljs.com/images/debugger.png"
            title="Cerebral JS"
            description="A state management tool for projects using plain Javascript and needs to handle application level complexity."
            url="https://cerebraljs.com"
          />
          <Card
            heroUrl="https://www.overmindjs.org/images/amazing_devtools.png"
            title="Overmind JS"
            description="A state management tool for projects using Typescript and needs to handle application level complexity."
            url="https://overmindjs.org"
          />
        </div>
      </div>
      <div className="other-row">
        <div className="other-column">
          <h4>NPM packages</h4>
          <ul>
            <li><a href="https://www.npmjs.com/package/marksy" target="_blank">marksy</a></li>
            <li><a href="https://www.npmjs.com/package/formsy-react" target="_blank">formsy-react</a></li>
            <li><a href="https://www.npmjs.com/package/form-data-to-object" target="_blank">form-data-to-object</a></li>
            <li><a href="https://www.npmjs.com/package/addressbar" target="_blank">addressbar</a></li>
            <li><a href="https://www.npmjs.com/package/react-simple-flex" target="_blank">react-simple-flex</a></li>
            <li><a href="https://www.npmjs.com/package/function-tree" target="_blank">function-tree</a></li>
            <li><a href="https://www.npmjs.com/package/create-ssl-certificate" target="_blank">create-ssl-certificate</a></li>
            <li><a href="https://www.npmjs.com/package/process-control" target="_blank">process-control</a></li>
            <li><a href="https://www.npmjs.com/package/babel-preset-enhanced-react-style" target="_blank">babel-preset-enhanced-react-style</a></li>
            <li><a href="https://www.npmjs.com/settings/christianalfoni/packages?page=0&perPage=2000" target="_blank">all packages...</a></li>
          </ul>
        </div>
        <div className="other-column">
          <h4>presentations</h4>
          <ul>
            <li><a href="https://www.youtube.com/watch?v=uni-dG6-Rq8" target="_blank"><small>Oslo JS Meetup 2019:</small> <br />UI as an implementation detail</a></li>
            <li><a href="https://www.youtube.com/watch?v=uni-dG6-Rq8" target="_blank"><small>React Finland 2018:</small> <br />Declarative state and side effects</a></li>
            <li><a href="https://www.youtube.com/watch?v=MnFV6wEqKFE" target="_blank"><small>ReactiveConf 2015:</small> <br/> State, UI and the stuff in between</a></li>
          </ul>
        </div>
      </div>
      <div className="other-row">
        <div className="other-column">
          <h4>Other tools and services</h4>
          <ul>
            <li><a href="https://pub.dev/packages/flutter_observable_state" target="_blank">flutter_observable_state</a></li>
            <li><a href="https://www.boilproject.io" target="_blank">boilproject.io</a></li>
          </ul>
        </div>
        <div className="other-column">
          <a className="rss" href="/api/rss">
            <FaRss size="4em" style={{ color: '#FAFAFA'}}/>
            Subscribe to updates
          </a>
        </div>
      </div>
    </Page>
  );
}

Index.getInitialProps = async () => {
  const lastArticleName = Object.keys(publisher.articles).sort((a, b) => publisher.articles[a].published > publisher.articles[b].published ? 1 : -1)[0]

  return {
    lastArticle: {
      title: publisher.articles[lastArticleName].title,
      heroUrl: publisher.articles[lastArticleName].heroUrl,
      name: lastArticleName,
      tldr: publisher.articles[lastArticleName].tldr
    },
    lastKofi: publisher.videos["ko-fi"][0]
  }
}

export default Index;