import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

// Metro resolves this `.ttf` import to the asset's public URL on web (with
// content hash). Inlining @font-face up here in the HTML head means the
// MaterialIcons glyphs are available before any JS runs — so on Vercel /
// Expo Web the icons paint immediately on hydration instead of flashing as
// blank Text nodes while expo-font registers the font asynchronously.
//
// The font is also registered later via `useFonts({...MaterialIcons.font})`
// in app/_layout.tsx for parity with native — that's a no-op on web because
// the @font-face here already exists, but it keeps the loading state in sync
// with what the icon component expects.
//
// Native builds ignore this file entirely (it's only consumed by
// `expo export --platform web` and `expo start --web`).
const materialIconsFont = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf") as string;

const MATERIAL_ICONS_FONT_FACE = `
@font-face {
  font-family: 'material';
  src: url('${materialIconsFont}') format('truetype');
  font-display: block;
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'MaterialIcons';
  src: url('${materialIconsFont}') format('truetype');
  font-display: block;
  font-weight: normal;
  font-style: normal;
}
`;

// Custom root HTML for the web export (PWA install metadata + icon font).
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
        {/* Preload the icon font so the browser fetches it before parsing the
            JS bundle. Without this, icons can flash blank for a noticeable
            moment on slower connections. */}
        <link
          rel="preload"
          href={materialIconsFont}
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* Register @font-face up-front so the icon glyphs are ready before
            React hydrates. expo-font would otherwise inject this same rule
            client-side, leaving a frame where icons render as boxes. */}
        <style dangerouslySetInnerHTML={{ __html: MATERIAL_ICONS_FONT_FACE }} />
        <title>Life Balance Assistant</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
