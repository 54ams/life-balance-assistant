import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

// Names known to render reliably on the iOS versions we support. SF Symbols
// added some of these only in iOS 16/17, so anything not in this set gets
// a documented fallback (heart.fill) on older devices instead of an empty
// placeholder. Keep this in sync with the Material mapping in icon-symbol.tsx.
const IOS_SAFE_NAMES = new Set<string>([
  // Navigation / chrome
  "house",
  "house.fill",
  "person",
  "person.fill",
  "person.2",
  "person.2.fill",
  "person.crop.circle.fill",
  "gearshape",
  "gearshape.fill",
  "chevron.left",
  "chevron.right",
  "chevron.up",
  "chevron.down",
  "chevron.left.forwardslash.chevron.right",
  "xmark",
  "ellipsis",
  "line.3.horizontal",

  // Arrows
  "arrow.right",
  "arrow.left",
  "arrow.down",
  "arrow.up",
  "arrow.up.right",
  "arrow.down.right",
  "arrow.left.arrow.right",
  "arrow.uturn.up",
  "arrow.uturn.left",
  "arrow.uturn.right",
  "arrow.clockwise",
  "arrow.counterclockwise",
  "arrow.triangle.2.circlepath",
  "arrow.triangle.branch",
  "arrow.down.doc",
  "arrow.up.doc",

  // Editing / actions
  "pencil",
  "pencil.circle.fill",
  "square.and.pencil",
  "plus",
  "plus.circle",
  "plus.circle.fill",
  "minus",
  "trash",
  "trash.fill",
  "checkmark",
  "checkmark.circle",
  "checkmark.circle.fill",
  "checkmark.seal",
  "checkmark.seal.fill",
  "checkmark.shield",
  "checkmark.shield.fill",
  "square.and.arrow.up",
  "square.and.arrow.up.fill",
  "square.and.arrow.down",
  "doc.on.doc",
  "doc",
  "doc.text",
  "doc.text.fill",
  "paperplane",
  "paperplane.fill",
  "magnifyingglass",

  // Data / charts
  "chart.bar",
  "chart.bar.fill",
  "chart.line.uptrend.xyaxis",
  "chart.pie",
  "chart.pie.fill",
  "checklist",
  "list.bullet",
  "function",
  "square.grid.2x2",
  "square.grid.2x2.fill",
  "square.stack.3d.up",
  "square.stack.3d.up.fill",

  // Time / scheduling
  "calendar",
  "calendar.badge.clock",
  "clock",
  "clock.fill",
  "alarm",
  "alarm.fill",
  "timer",

  // Communication / info
  "bell",
  "bell.fill",
  "bubble.left",
  "bubble.left.fill",
  "exclamationmark.bubble",
  "exclamationmark.bubble.fill",
  "info.circle",
  "info.circle.fill",
  "questionmark.circle",
  "questionmark.circle.fill",
  "phone",
  "phone.fill",
  "envelope",
  "envelope.fill",
  "lock",
  "lock.fill",
  "lock.shield",
  "key",
  "key.fill",
  "externaldrive",
  "externaldrive.fill",
  "wrench",
  "wrench.fill",
  "play",
  "play.fill",
  "pause",
  "pause.fill",
  "mic",
  "mic.fill",
  "speaker.wave.2",
  "speaker.slash",

  // Wellbeing / theme / nature
  "sparkles",
  "lightbulb",
  "lightbulb.fill",
  "leaf",
  "leaf.fill",
  "tree",
  "drop",
  "drop.fill",
  "flame",
  "flame.fill",
  "sun.max",
  "sun.max.fill",
  "cloud",
  "cloud.fill",
  "moon",
  "moon.fill",
  "moon.zzz",
  "moon.zzz.fill",
  "wind",
  "snow",
  "bolt",
  "bolt.fill",
  "repeat",
  "exclamationmark.triangle",
  "exclamationmark.triangle.fill",
  "waveform.path.ecg",
  "cross.case",
  "cross.case.fill",
  "bandage",
  "bandage.fill",
  "pills",
  "pills.fill",
  "fork.knife",
  "cup.and.saucer",
  "cup.and.saucer.fill",
  "text.book.closed",
  "text.book.closed.fill",
  "book",
  "book.fill",
  "book.closed",
  "book.closed.fill",
  "graduationcap",
  "graduationcap.fill",
  "text.quote",
  "tray",
  "tray.full",
  "tray.full.fill",
  "creditcard",
  "creditcard.fill",
  "paintbrush",
  "paintbrush.fill",
  "paintpalette",
  "paintpalette.fill",
  "tag",
  "tag.fill",
  "flag",
  "flag.fill",
  "bookmark",
  "bookmark.fill",
  "star",
  "star.fill",
  "heart",
  "heart.fill",
  "heart.circle",
  "heart.circle.fill",
  "heart.text.square",
  "heart.text.square.fill",

  // Devices / wearables / connectivity
  "applewatch",
  "iphone",
  "ipad",
  "laptopcomputer",
  "antenna.radiowaves.left.and.right",
  "wifi",
  "wifi.slash",
  "circle.circle.fill",
  "circle",
  "circle.fill",
  "square",
  "square.fill",

  // People / activity
  "figure.run",
  "figure.walk",
  "figure.mind.and.body",
  "brain.head.profile",
  "brain",
  "airplane",

  // Misc
  "globe",
  "location",
  "location.fill",
  "map",
  "map.fill",
  "eye",
  "eye.fill",
  "eye.slash",
  "eye.slash.fill",
  "hand.thumbsup",
  "hand.thumbsup.fill",
  "hand.thumbsdown",
  "hand.thumbsdown.fill",
]);

const FALLBACK_NAME = "circle" as const;
const warned = new Set<string>();

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const safe = IOS_SAFE_NAMES.has(name) ? name : FALLBACK_NAME;
  if (__DEV__ && safe !== name && !warned.has(name)) {
    warned.add(name);
    console.warn(`[IconSymbol/iOS] "${name}" not in safe set — falling back to "${FALLBACK_NAME}"`);
  }
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={safe as SymbolViewProps["name"]}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
