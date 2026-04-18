// Three-tab ring: Home · Patterns · Check-ins.
// Everything else (profile, calendar, history, check-in form) is reachable
// from inside one of these three — they never appear in the tab bar.
export const TAB_ORDER = ["/", "/insights", "/checkins"] as const;
