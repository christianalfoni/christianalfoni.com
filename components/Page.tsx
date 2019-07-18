import Link from 'next/link';
import Head from "next/head";
import { useRouter } from 'next/router';
import { FaRss, FaGithub, FaTwitter } from 'react-icons/fa';

const Page: React.FunctionComponent = ({ children }) => {
  const router = useRouter()

  return (
    <div className="page">
      <Head>
        <link href="https://fonts.googleapis.com/css?family=Palanquin:700|Roboto:400,400i,700&display=swap" rel="stylesheet" />
      </Head>
      <style jsx global>{`
        body {
          color: #333;
          background-color: #FAFAFA;
          margin: 0;
          line-height: 1.4;
          font-family: 'Roboto', sans-serif;
        }
      `}</style>
      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .content {
          flex: 1;
          height: 100%;
          width: 700px;
          margin: 0 auto;
          padding: 4rem 1rem 1rem 1rem;
        }
        .navigation-wrapper {
          position: fixed;
          width: 100%;
          top: 0;
          left: 0;
          background-color: #FAFAFA;
          z-index: 2;
        }
        .navigation {
          width: 700px;
          display: flex;
          margin: 0 auto;
          padding: 1rem;
        }
        .navigation a {
          color: #333;
          text-decoration: none;
          font-size: 18px;
          opacity: 0.75;
          transition: opacity 0.15s ease-in;
          width: 100px;
          text-align: center;
          text-transform: lowercase;
        }
        .navigation a:hover {
          opacity: 1;

        }
        .navigation a.active {
          color: #ED2939;
          font-weight: bold;
          opacity: 1;
        }
        .navigation-right {
          margin-left: auto;
          margin-right: 1rem;
        }
        .navigation-right a {
          margin-left: 1rem;
        }
        .footer {
          background-color: #EAEAEA;
          padding: 1rem;
        }
        .footer-content {
          width: 700px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .footer-content a {
          margin-left: 1rem;
          color: #333;
        }
        @media(max-width: 700px) {
          .navigation-right {
            display: none;
          }
          .content {
            width: 100%;
            box-sizing: border-box;
          }
          .footer-content {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>
      <div className="navigation-wrapper">
        <nav className="navigation">
          <Link href="/">
            <a className={router.pathname === '/' ? 'active' : null}>Home</a>
          </Link>
          <Link href="/articles">
            <a className={router.pathname === '/articles' ? 'active' : null}>Articles</a>
          </Link>
          <Link href="/videos">
            <a className={router.pathname.includes('/videos') ? 'active' : null}>Videos</a>
          </Link>
          <div className="navigation-right">
          <a href="/api/rss"><FaRss /></a>
          <a href="https://www.github.com/christianalfoni" target="_blank"><FaGithub  /></a>
          <a href="https://www.twitter.com/christianalfoni" target="_blank"><FaTwitter  /></a>
          </div>
        </nav>
      </div>
      <div className="content">
        {children}
      </div>
      <div className="footer">
        <div className="footer-content">
          christianalfoni © 2019 <a href="/api/rss"><FaRss /></a>
          <a href="https://www.github.com/christianalfoni" target="_blank"><FaGithub  /></a>
          <a href="https://www.twitter.com/christianalfoni" target="_blank"><FaTwitter  /></a>
        </div>
      </div>
    </div>
  );
}

export default Page;