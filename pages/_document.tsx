import { Html, Head, Main, NextScript } from "next/document";

const Document = () => {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#17B14A" />
        <link rel="icon" href="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </Head>
      <body className="bg-slate-950 text-slate-50 antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default Document;

