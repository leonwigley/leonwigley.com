import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>leonwigley</title>

        <meta name="description" content="Personal blog of Leon Wigley." />
        <meta
          name="keywords"
          content="blog, projects, business, marketing, sales, books, opinion, content"
        />
        <meta name="author" content="Leon Wigley" />
        <link rel="shortcut icon" href="/favicon.jpg" type="image/x-icon" />

        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
