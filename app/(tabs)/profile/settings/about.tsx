import { Pressable, Text, View } from "react-native";
import { useState } from "react";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { useColorScheme } from "react-native";

function Section({
  title,
  children,
  defaultOpen = false,
  c,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  c: typeof Colors.light;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassCard padding="base">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        accessibilityRole="button"
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>{title}</Text>
        </View>
        <IconSymbol
          name={open ? "chevron.down" : "chevron.right"}
          size={12}
          color={c.text.tertiary}
        />
      </Pressable>
      {open && <View style={{ marginTop: 12 }}>{children}</View>}
    </GlassCard>
  );
}

function P({ children, c }: { children: string; c: typeof Colors.light }) {
  return (
    <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
      {children}
    </Text>
  );
}

function Cite({ children, c }: { children: string; c: typeof Colors.light }) {
  return (
    <Text
      style={{
        color: c.text.tertiary,
        fontSize: 11,
        lineHeight: 15,
        marginTop: 4,
        fontStyle: "italic",
      }}
    >
      {children}
    </Text>
  );
}

export default function AboutScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text
        style={{
          color: c.text.tertiary,
          fontSize: Typography.fontSize.xs,
          fontFamily: Typography.fontFamily.bold,
          letterSpacing: Typography.letterSpacing.allcaps,
          fontWeight: "800",
        }}
      >
        ABOUT
      </Text>
      <Text
        style={{
          color: c.text.primary,
          fontSize: 32,
          fontFamily: Typography.fontFamily.serifItalic,
          marginTop: 4,
          lineHeight: 38,
        }}
      >
        Life Balance Assistant
      </Text>
      <Text style={{ color: c.text.secondary, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
        A prototype wellbeing app built as a BCS synoptic dissertation project. It bridges wearable
        physiology and self-reported psychology into a single daily picture.
      </Text>

      <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Section title="What it does" defaultOpen c={c}>
          <P c={c}>
            LBA combines data from a wearable device (recovery, sleep, strain) with a short daily
            check-in (affect, life context, free notes) to produce a Life Balance Index — a single
            0–100 score reflecting how your body and mind are tracking together.
          </P>
          <P c={c}>
            When the two sides diverge, the app offers direction-matched micro-interventions
            (breathing exercises, grounding rituals) rather than generic advice. All data stays on
            your device.
          </P>
        </Section>

        <Section title="The Mind–Body Bridge (H8)" c={c}>
          <P c={c}>
            The central novelty claim. Rather than treating wearable and self-report data as separate
            streams, LBA maps them onto a shared 0–100 scale and visualises their relationship over
            time. The "bridge" metaphor draws on Thayer & Lane's (2000) neurovisceral integration
            model, which posits that autonomic and cognitive regulation share common prefrontal
            circuitry.
          </P>
          <P c={c}>
            A third track — cognitive load — is derived from arousal, demand pressure, and negative
            valence. Research suggests prefrontal load often leads physiological response (Thayer &
            Lane, 2000), so showing the three lines together makes lead-lag patterns visible.
          </P>
          <Cite c={c}>
            Thayer, J.F. & Lane, R.D. (2000). A model of neurovisceral integration in emotion
            regulation and dysregulation. Journal of Affective Disorders, 61(3), 201–216.
          </Cite>
        </Section>

        <Section title="Affect model" c={c}>
          <P c={c}>
            Check-ins use Russell's (1980) circumplex model of affect. Instead of discrete emotion
            labels, users place themselves on a two-dimensional canvas: valence (pleasant ↔
            unpleasant) and arousal (activated ↔ calm). This avoids the vocabulary bias of labelled
            scales and captures the full space of affective experience.
          </P>
          <Cite c={c}>
            Russell, J.A. (1980). A circumplex model of affect. Journal of Personality and Social
            Psychology, 39(6), 1161–1178.
          </Cite>
        </Section>

        <Section title="Life context tagging" c={c}>
          <P c={c}>
            The life context taxonomy (demands vs. resources) is grounded in Lazarus & Folkman's
            (1984) transactional model of stress. Stress is not in the event itself but in the
            perceived balance between demands placed on a person and the resources available to meet
            them. Tags like "exam", "deadline", and "workload" represent demands; "friends",
            "nature", and "rest" represent resources.
          </P>
          <Cite c={c}>
            Lazarus, R.S. & Folkman, S. (1984). Stress, Appraisal, and Coping. New York: Springer.
          </Cite>
        </Section>

        <Section title="Triangulation" c={c}>
          <P c={c}>
            The agreement score shown alongside the bridge uses Denzin's (1978) concept of
            methodological triangulation. Four modalities are compared: canvas valence, tag demand
            pressure (inverted), note sentiment, and wearable recovery. When they converge, confidence
            is higher. When they diverge, the app flags "mixed signals" — a prompt for reflection, not
            a diagnosis.
          </P>
          <Cite c={c}>
            Denzin, N.K. (1978). The Research Act: A Theoretical Introduction to Sociological
            Methods. New York: McGraw-Hill.
          </Cite>
        </Section>

        <Section title="Ecological momentary assessment" c={c}>
          <P c={c}>
            The "Does this read your day?" reliability signal after each check-in follows Shiffman
            et al.'s (2008) ecological momentary assessment principles. A single-item self-report at
            the moment of highest attention (right after submission) acts as a lightweight reliability
            anchor without adding survey fatigue.
          </P>
          <Cite c={c}>
            Shiffman, S., Stone, A.A. & Hufford, M.R. (2008). Ecological momentary assessment.
            Annual Review of Clinical Psychology, 4, 1–32.
          </Cite>
        </Section>

        <Section title="Transparency and XAI" c={c}>
          <P c={c}>
            Every score in the app can be "flipped" to reveal the calculation behind it. This follows
            Doshi-Velez & Kim's (2017) call for interpretable machine learning — the user should be
            able to verify, challenge, and override any output. The "show my maths" panels,
            confirmable suggestion chips, and reliability signals are all instances of this principle.
          </P>
          <Cite c={c}>
            Doshi-Velez, F. & Kim, B. (2017). Towards a rigorous science of interpretable machine
            learning. arXiv:1702.08608.
          </Cite>
        </Section>

        <Section title="What this isn't" c={c}>
          <P c={c}>
            This is a prototype for personal reflection — not medical advice, not a crisis service,
            not a substitute for professional care. Patterns shown are observational. Correlation is
            not causation. The model has not been externally validated.
          </P>
          <P c={c}>
            If you are in distress or need someone to talk to, please use the safety resources
            available in Settings → If you need support.
          </P>
        </Section>

        <Section title="Credits" c={c}>
          <P c={c}>
            Built by Amira Wadar as a BCS Level 6 Synoptic Project, 2025–2026.
          </P>
          <P c={c}>
            Supervised at the University of Gloucestershire. Uses Expo, React Native, and the WHOOP
            API for wearable integration.
          </P>
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: 12,
              marginTop: Spacing.base,
              textAlign: "center",
            }}
          >
            Life Balance Assistant · v1.0.0
          </Text>
        </Section>
      </View>
    </Screen>
  );
}
