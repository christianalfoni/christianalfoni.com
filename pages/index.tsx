import { NextPage } from "next";
import Head from "next/head";
import Page from "../components/Page";
import publisher from "../publisher.json";
import Link from "next/link";
import { FaRss } from "react-icons/fa";
import { Video } from "../types";

const Card: React.FunctionComponent<{
  heroUrl: string;
  title: string;
  description: string;
  url: string;
}> = ({ url, title, heroUrl, description }) => {
  return (
    <Link href={url}>
      <a className="card" target={url.startsWith("http") ? "_blank" : null}>
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
            background-position: center;
          }
          .card h2 {
            font-size: 18px;
            font-weight: 700;
            margin: 0.25rem 0;
            display: block;
            height: 50px;
            display: flex;
            align-items: center;
          }
          .description {
            font-size: 14px;
          }
        `}</style>

        <div
          className="hero"
          style={{
            backgroundImage: `url("${heroUrl}")`,
          }}
        />

        <h2>{title}</h2>

        <div className="description">{description}</div>
      </a>
    </Link>
  );
};

const Index: NextPage<{
  lastArticle: {
    title: string;
    heroUrl: string;
    name: string;
    tldr: string;
  };
  lastVideo: Video;
  presentations: Video[];
}> = ({ lastArticle, lastVideo, presentations }) => {
  return (
    <Page>
      <Head>
        <title>christianalfoni - developer blog</title>
        <meta
          name="description"
          content="The developer blog of Christian Alfoni. Freelancing, Javascript, Typescript, state management and more"
        ></meta>
        <meta name="twitter:card" content="summary"></meta>
        <meta
          name="og:title"
          property="og:title"
          content="christianalfoni - developer blog"
        ></meta>
        <meta name="og:type" property="og:type" content="website"></meta>
        <meta
          name="og:url"
          property="og:url"
          content="https://christianalfoni.com"
        ></meta>
        <meta
          name="og:description"
          property="og:description"
          content="The developer blog of Christian Alfoni. Freelancing, Javascript, Typescript, state management and more"
        ></meta>
        <meta
          name="og:image"
          property="og:image"
          content="https://christianalfoni.com/static/logo.jpg"
        ></meta>
      </Head>
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
          color: #ed2939;
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
        .other-row a.rss {
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
          color: #fafafa;
          background-color: rgb(235, 130, 22);
          border-radius: 5px;
        }
        @media (max-width: 700px) {
          .cards-row,
          .other-row {
            flex-direction: column;
          }
          .other-row a.rss {
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
            heroUrl={`https://i.ytimg.com/vi/${lastVideo.youtubeId}/hqdefault.jpg`}
            title={
              lastVideo.title.length > 60
                ? lastVideo.title.substr(0, 60) + "..."
                : lastVideo.title
            }
            description={lastVideo.description}
            url={`https://www.youtube.com/watch?v=${lastVideo.youtubeId}`}
          />
        </div>
        <div className="cards-row">
          <Card
            heroUrl="/static/cerebral.png"
            title="Cerebral JS"
            description="A state management tool for projects using plain Javascript and needs to handle application level complexity."
            url="https://cerebraljs.com"
          />
          <Card
            heroUrl="/static/overmind.png"
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
            <li>
              <a href="https://www.npmjs.com/package/marksy" target="_blank">
                marksy
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/formsy-react"
                target="_blank"
              >
                formsy-react
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/form-data-to-object"
                target="_blank"
              >
                form-data-to-object
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/addressbar"
                target="_blank"
              >
                addressbar
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/react-simple-flex"
                target="_blank"
              >
                react-simple-flex
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/function-tree"
                target="_blank"
              >
                function-tree
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/create-ssl-certificate"
                target="_blank"
              >
                create-ssl-certificate
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/process-control"
                target="_blank"
              >
                process-control
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/babel-preset-enhanced-react-style"
                target="_blank"
              >
                babel-preset-enhanced-react-style
              </a>
            </li>
            <li>
              <a href="https://www.npmjs.com/~christianalfoni" target="_blank">
                all packages...
              </a>
            </li>
          </ul>
        </div>
        <div className="other-column">
          <h4>presentations</h4>
          <ul>
            {presentations.slice(0, 3).map((presentation) => (
              <li>
                <a
                  href={`https://www.youtube.com/watch?v=${presentation.youtubeId}`}
                  target="_blank"
                >
                  {presentation.title}
                  <br />
                  <small>{presentation.published}</small>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="other-row">
        <div className="other-column">
          <h4>Other tools and services</h4>
          <ul>
            <li>
              <a
                href="https://pub.dev/packages/flutter_observable_state"
                target="_blank"
              >
                flutter_observable_state
              </a>
            </li>
            <li>
              <a href="https://www.boilproject.io" target="_blank">
                boilproject.io
              </a>
            </li>
          </ul>
        </div>
        <div className="other-column">
          <a className="rss" href="/api/rss">
            <FaRss size="4em" style={{ color: "#FAFAFA" }} />
            Subscribe to updates
          </a>
        </div>
      </div>
    </Page>
  );
};

Index.getInitialProps = async () => {
  const lastArticleName = Object.keys(publisher.articles).sort((a, b) =>
    publisher.articles[a].published > publisher.articles[b].published ? 1 : -1
  )[0];

  return {
    lastArticle: {
      title: publisher.articles[lastArticleName].title,
      heroUrl: publisher.articles[lastArticleName].heroUrl,
      name: lastArticleName,
      tldr: publisher.articles[lastArticleName].tldr,
    },
    lastVideo: Object.keys(publisher.videos).reduce((aggr, key) => {
      if (!aggr) {
        return publisher.videos[key][0];
      }

      return publisher.videos[key].reduce((current, video) => {
        return current.published < video.published ? video : current;
      }, aggr);
    }, null),
    presentations: publisher.videos.presentations,
  };
};

export default Index;
