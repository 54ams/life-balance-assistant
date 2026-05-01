import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useColorScheme } from "react-native";
import { Linking, Pressable, Text, View } from "react-native";
import { useState } from "react";

function Expandable({
  title,
  children,
  c,
}: {
  title: string;
  children: React.ReactNode;
  c: typeof Colors.light;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      style={{ paddingVertical: 12 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconSymbol
          name={open ? "chevron.down" : "chevron.right"}
          size={10}
          color={c.text.tertiary}
        />
        <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, flex: 1 }}>
          {title}
        </Text>
      </View>
      {open && <View style={{ marginTop: 8, marginLeft: 20 }}>{children}</View>}
    </Pressable>
  );
}

function P({ children, c }: { children: string; c: typeof Colors.light }) {
  return (
    <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
      {children}
    </Text>
  );
}

function LinkRow({ label, url, c }: { label: string; url: string; c: typeof Colors.light }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      style={{
        borderWidth: 1,
        borderColor: c.border.medium,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ color: c.text.primary, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export default function HelpResourcesScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <ScreenHeader title="Help & safety" eyebrow="SUPPORT" />

      {/* Crisis resources — always visible at top */}
      <GlassCard style={{ marginTop: Spacing.lg, borderLeftWidth: 3, borderLeftColor: c.warning }} padding="base">
        <Text style={{ color: c.warning, fontWeight: "800", fontSize: 17 }}>
          If you need someone right now
        </Text>
        <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
          This app is not a crisis service. If you are in danger or need to talk to someone, please
          use one of these.
        </Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          <LinkRow label="999 — Emergency services" url="tel:999" c={c} />
          <LinkRow label="Samaritans — 116 123 (free, 24/7)" url="tel:116123" c={c} />
          <LinkRow label="Shout — text SHOUT to 85258" url="sms:85258&body=SHOUT" c={c} />
          <LinkRow label="NHS 111 — non-urgent health advice" url="tel:111" c={c} />
          <LinkRow label="Mind — information and support" url="https://www.mind.org.uk/" c={c} />
          <LinkRow label="CALM — helpline for men (5pm–midnight)" url="tel:0800585858" c={c} />
        </View>
      </GlassCard>

      {/* Understanding the app */}
      <View style={{ marginTop: Spacing.lg }}>
        <Text
          style={{
            color: c.text.tertiary,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.2,
            marginBottom: Spacing.xs,
          }}
        >
          UNDERSTANDING THE APP
        </Text>
        <GlassCard padding="base">
          <Expandable title="What does the orb mean?" c={c}>
            <P c={c}>
              The orb on the home screen shows your mind-body balance at a glance. Green means your
              body and mind are tracking together. When one gets ahead of the other, the colour shifts
              and the breathing pattern changes. Tap it to see the Mind–Body Bridge chart.
            </P>
          </Expandable>

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />

          <Expandable title="How is the balance score calculated?" c={c}>
            <P c={c}>
              The Life Balance Index (LBI) combines your wearable data (recovery and sleep count for
              70%) with your check-in data (mood and stress count for 30%). The result is a single
              0–100 score. You can always tap "show the maths" to see the exact calculation.
            </P>
          </Expandable>

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />

          <Expandable title="What is triangulation?" c={c}>
            <P c={c}>
              The app compares four signals: your affect canvas position, your life context tags, your
              note sentiment, and your wearable recovery. When they tell the same story, the app shows
              "converging". When they disagree, it flags "mixed signals" — an invitation to reflect,
              not a judgement.
            </P>
          </Expandable>

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />

          <Expandable title="What does 'correlation ≠ causation' mean?" c={c}>
            <P c={c}>
              When the app shows a relationship between two things (e.g. sleep and mood), it means
              they tend to move together — not that one causes the other. These patterns are things to
              notice and reflect on, not rules to follow.
            </P>
          </Expandable>

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />

          <Expandable title="How does privacy work?" c={c}>
            <P c={c}>
              All your data stays on this device. Nothing is sent to a server unless you explicitly
              ask for a "deeper read" of your note (which uses an AI model). Even then, your note is
              scrubbed of identifying information before it leaves. You can delete all your data at
              any time from Settings → Your data.
            </P>
          </Expandable>

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />

          <Expandable title="What are the breathing exercises based on?" c={c}>
            <P c={c}>
              The app matches breathing patterns to the direction of your mind-body gap. When your
              body is ahead, you get extended exhales (4-7-8) to down-regulate. When your mind is
              racing, you get a grounding pattern (4-4-6). When both are low, a simple box breath
              (4-4-4-4). These are evidence-based techniques from autonomic regulation research.
            </P>
          </Expandable>

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />

          <Expandable title="Why does the app ask about values?" c={c}>
            <P c={c}>
              Your values shape the daily plan. If you value "Growth", the app might suggest learning
              something new on a good day, or gentle reading on a recovery day. Values rotate across
              days so plans feel fresh. You can change them anytime in Settings.
            </P>
          </Expandable>

          <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />

          <Expandable title="Do I need a WHOOP to use this app?" c={c}>
            <P c={c}>
              No. The check-in alone gives you a mental score and access to most features. A WHOOP
              adds the physiological side (recovery, sleep, strain), which enables the full Mind–Body
              Bridge and the balance score. You can also enter wearable numbers manually.
            </P>
          </Expandable>
        </GlassCard>
      </View>

      <Text
        style={{
          color: c.text.tertiary,
          fontSize: 11,
          textAlign: "center",
          marginTop: Spacing.lg,
          marginBottom: Spacing.sm,
          lineHeight: 16,
        }}
      >
        If you notice rising distress, thoughts of harming yourself, or you can't stay safe, please
        reach out now. You don't have to wait for it to get worse.
      </Text>
    </Screen>
  );
}
