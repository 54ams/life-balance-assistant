// Fallback for using MaterialIcons on Android and web.
//
// On iOS we render real SF Symbols (see icon-symbol.ios.tsx). On every other
// platform we map the SF Symbol name to the closest Material Icons glyph.
// Any name without a mapping renders a neutral fallback, so this list must
// cover every icon the app passes to <IconSymbol />.
//
// IMPORTANT: keep this exhaustive. On web the SF Symbol library is unavailable,
// so anything missing here renders the fallback glyph instead of the real
// concept — which is the most common cause of "icons missing on Vercel".

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

// Mapping is intentionally permissive on the key side (string) so every call
// site type-checks; the value side stays strict against the MaterialIcons set.
const MAPPING: Record<string, MaterialIconName> = {
  // Navigation / chrome
  "house": "home",
  "house.fill": "home",
  "person": "person-outline",
  "person.fill": "person",
  "person.2": "people-outline",
  "person.2.fill": "people",
  "person.crop.circle.fill": "account-circle",
  "gearshape": "settings",
  "gearshape.fill": "settings",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "chevron.up": "expand-less",
  "chevron.down": "expand-more",
  "chevron.left.forwardslash.chevron.right": "code",
  "xmark": "close",
  "ellipsis": "more-horiz",
  "line.3.horizontal": "menu",

  // Arrows
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "arrow.down": "arrow-downward",
  "arrow.up": "arrow-upward",
  "arrow.up.right": "trending-up",
  "arrow.down.right": "trending-down",
  "arrow.left.arrow.right": "compare-arrows",
  "arrow.uturn.up": "undo",
  "arrow.uturn.left": "undo",
  "arrow.uturn.right": "redo",
  "arrow.clockwise": "refresh",
  "arrow.counterclockwise": "history",
  "arrow.triangle.2.circlepath": "loop",
  "arrow.triangle.branch": "call-split",
  "arrow.down.doc": "file-download",
  "arrow.up.doc": "file-upload",

  // Editing / actions
  "pencil": "edit",
  "pencil.circle.fill": "edit",
  "square.and.pencil": "edit-note",
  "plus": "add",
  "plus.circle": "add-circle-outline",
  "plus.circle.fill": "add-circle",
  "minus": "remove",
  "trash": "delete-outline",
  "trash.fill": "delete",
  "checkmark": "check",
  "checkmark.circle": "check-circle-outline",
  "checkmark.circle.fill": "check-circle",
  "checkmark.seal": "verified",
  "checkmark.seal.fill": "verified",
  "checkmark.shield": "verified-user",
  "checkmark.shield.fill": "verified-user",
  "square.and.arrow.up": "ios-share",
  "square.and.arrow.up.fill": "ios-share",
  "square.and.arrow.down": "file-download",
  "doc.on.doc": "content-copy",
  "doc": "description",
  "doc.text": "description",
  "doc.text.fill": "description",
  "paperplane": "send",
  "paperplane.fill": "send",
  "magnifyingglass": "search",

  // Data / charts
  "chart.bar": "bar-chart",
  "chart.bar.fill": "insights",
  "chart.line.uptrend.xyaxis": "show-chart",
  "chart.pie": "pie-chart",
  "chart.pie.fill": "pie-chart",
  "checklist": "checklist",
  "list.bullet": "format-list-bulleted",
  "function": "functions",
  "square.grid.2x2": "grid-view",
  "square.grid.2x2.fill": "grid-view",
  "square.stack.3d.up": "layers",
  "square.stack.3d.up.fill": "layers",

  // Time / scheduling
  "calendar": "calendar-month",
  "calendar.badge.clock": "event-available",
  "clock": "schedule",
  "clock.fill": "history",
  "alarm": "alarm",
  "alarm.fill": "alarm",
  "timer": "timer",

  // Communication / info
  "bell": "notifications-none",
  "bell.fill": "notifications",
  "bubble.left": "chat-bubble-outline",
  "bubble.left.fill": "chat-bubble",
  "exclamationmark.bubble": "feedback",
  "exclamationmark.bubble.fill": "feedback",
  "info.circle": "info-outline",
  "info.circle.fill": "info",
  "questionmark.circle": "help-outline",
  "questionmark.circle.fill": "help",
  "phone": "phone",
  "phone.fill": "phone",
  "envelope": "mail-outline",
  "envelope.fill": "email",
  "lock": "lock-outline",
  "lock.fill": "lock",
  "lock.shield": "security",
  "key": "key",
  "key.fill": "vpn-key",
  "externaldrive": "storage",
  "externaldrive.fill": "storage",
  "wrench": "build",
  "wrench.fill": "build",
  "play": "play-arrow",
  "play.fill": "play-arrow",
  "pause": "pause",
  "pause.fill": "pause",
  "mic": "mic-none",
  "mic.fill": "mic",
  "speaker.wave.2": "volume-up",
  "speaker.slash": "volume-off",

  // Wellbeing / theme / nature
  "sparkles": "auto-awesome",
  "lightbulb": "lightbulb-outline",
  "lightbulb.fill": "lightbulb",
  "leaf": "eco",
  "leaf.fill": "eco",
  "tree": "park",
  "drop": "water-drop",
  "drop.fill": "water-drop",
  "flame": "local-fire-department",
  "flame.fill": "local-fire-department",
  "sun.max": "wb-sunny",
  "sun.max.fill": "wb-sunny",
  "cloud": "cloud",
  "cloud.fill": "cloud",
  "moon": "bedtime",
  "moon.fill": "bedtime",
  "moon.zzz": "bedtime",
  "moon.zzz.fill": "bedtime",
  "wind": "air",
  "snow": "ac-unit",
  "bolt": "bolt",
  "bolt.fill": "bolt",
  "repeat": "repeat",
  "exclamationmark.triangle": "warning-amber",
  "exclamationmark.triangle.fill": "warning",
  "waveform.path.ecg": "monitor-heart",
  "cross.case": "medical-services",
  "cross.case.fill": "medical-services",
  "bandage": "healing",
  "bandage.fill": "healing",
  "pills": "medication",
  "pills.fill": "medication",
  "fork.knife": "restaurant",
  "cup.and.saucer": "local-cafe",
  "cup.and.saucer.fill": "local-cafe",
  "text.book.closed": "menu-book",
  "text.book.closed.fill": "menu-book",
  "book": "book",
  "book.fill": "book",
  "book.closed": "menu-book",
  "book.closed.fill": "menu-book",
  "graduationcap": "school",
  "graduationcap.fill": "school",
  "text.quote": "format-quote",
  "tray": "inbox",
  "tray.full": "inbox",
  "tray.full.fill": "inbox",
  "creditcard": "credit-card",
  "creditcard.fill": "credit-card",
  "paintbrush": "brush",
  "paintbrush.fill": "brush",
  "paintpalette": "palette",
  "paintpalette.fill": "palette",
  "tag": "label-outline",
  "tag.fill": "label",
  "flag": "flag",
  "flag.fill": "flag",
  "bookmark": "bookmark-border",
  "bookmark.fill": "bookmark",
  "star": "star-border",
  "star.fill": "star",
  "heart": "favorite-border",
  "heart.fill": "favorite",
  "heart.circle": "favorite",
  "heart.circle.fill": "favorite",
  "heart.text.square": "favorite-border",
  "heart.text.square.fill": "favorite",

  // Devices / wearables / connectivity
  "applewatch": "watch",
  "iphone": "smartphone",
  "ipad": "tablet",
  "laptopcomputer": "laptop",
  "antenna.radiowaves.left.and.right": "sensors",
  "wifi": "wifi",
  "wifi.slash": "wifi-off",
  "circle.circle.fill": "radio-button-checked",
  "circle": "radio-button-unchecked",
  "circle.fill": "circle",
  "square": "crop-square",
  "square.fill": "crop-square",

  // People / activity
  "figure.run": "directions-run",
  "figure.walk": "directions-walk",
  "figure.mind.and.body": "self-improvement",
  "brain.head.profile": "psychology",
  "brain": "psychology",
  "airplane": "flight",

  // Misc
  "globe": "public",
  "location": "location-on",
  "location.fill": "location-on",
  "map": "map",
  "map.fill": "map",
  "eye": "visibility",
  "eye.fill": "visibility",
  "eye.slash": "visibility-off",
  "eye.slash.fill": "visibility-off",
  "hand.thumbsup": "thumb-up-off-alt",
  "hand.thumbsup.fill": "thumb-up",
  "hand.thumbsdown": "thumb-down-off-alt",
  "hand.thumbsdown.fill": "thumb-down",
};

// `circle` reads as a neutral "marker" rather than the loud "?" of help-outline,
// so a missed mapping in production looks intentional rather than broken. In
// dev we still warn so missing entries get surfaced quickly.
const FALLBACK_ICON: MaterialIconName = "circle";

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
// Track names we've already warned about so dev console doesn't fill up
// when an unmapped icon renders inside a list.
const warnedMissing = new Set<string>();

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: unknown;
}) {
  const mapped = MAPPING[name];
  if (mapped == null && __DEV__ && !warnedMissing.has(name)) {
    warnedMissing.add(name);
    console.warn(`[IconSymbol] No Material Icon mapping for "${name}" — falling back to "${FALLBACK_ICON}"`);
  }
  return <MaterialIcons color={color} size={size} name={mapped ?? FALLBACK_ICON} style={style} />;
}
