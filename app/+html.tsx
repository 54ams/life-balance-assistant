import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

// Custom root HTML for the web export (PWA install metadata).
// This file has no effect on iOS/Android native builds — it's only consumed
// by `expo export --platform web` and `expo start --web`.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#EFE8D9" />
        <meta name="application-name" content="Life Balance Assistant" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="LBA" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <title>Life Balance Assistant</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
