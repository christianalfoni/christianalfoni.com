import Document, { Head, Main, NextScript } from 'next/document';
import { Fragment } from 'react';

export default class MyDocument extends Document {
  render() {
    return (
      <html>
        <Head />
        <body>
          <Main />
          <NextScript />
          {process.env.NODE_ENV === 'production' && (
            <Fragment>
              <script
                async
                src="https://www.googletagmanager.com/gtag/js?id=UA-53419566-1"
              />
              <script dangerouslySetInnerHTML={{
                __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-53419566-1');
                `
              }} />
            </Fragment>
          )}
        </body>
      </html>
    );
  }
}