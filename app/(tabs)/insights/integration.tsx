import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { calculateLBI } from "@/lib/lbi";
import { computeIntegrationSummary } from "@/lib/integration";
import { computeBaselineMeta } from "@/lib/baseline";
import { getDay } from "@/lib/storage";
import { formatDisplayDate } from "@/lib/date";
import type { ISODate } from "@/lib/types";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";

function todayISO(): ISODate {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as ISODate;
}

function isFutureISODate(s: ISODate): boolean {
  return s > todayISO();
}

export default function IntegrationScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

  const [date, setDate] = useState<ISODate>(todayISO());
  const [dateError, setDateError] = useState<string | null>(null);

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load persisted selected date once
  useEffect(() => {
    (async () => {
      const saved = await getInsightsSelectedDate();
      setDate(saved);
    })();
  }, []);

  // Load data when date changes
  useEffect(() => {
    (async () => {
      setDateError(null);
      if (isFutureISODate(date)) {
        setDateError("We can only show integration for dates in the past.");
        return;
      }

      await setInsightsSelectedDate(date);

      setLoading(true);
      try {
        const d = await getDay(date);
        setRecord(d);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  const computed = useMemo(() => {
    if (!record) return null;

    const b = record.baseline ?? null;
    const baselineMeta = computeBaselineMeta(b);

    const lbi = calculateLBI({
      recovery: record.wearable?.recovery ?? 50,
      sleepHours: record.wearable?.sleepHours ?? 7,
      strain: record.wearable?.strain,
      checkIn: record.checkIn ?? null,
    });

    const summary = computeIntegrationSummary({
      checkIn: record.checkIn ?? null,
      wearable: record.wearable ?? null,
      lbi,
    });

    return { baselineMeta, lbi, summary };
  }, [record]);

  const hasAnyData = !!(record?.checkIn || record?.wearable);

  return (
    <Screen title="Integration" subtitle="Mental + physiological signal coverage for a specific date">
      <View style={{ gap: 12 }}>
        <InsightsDatePicker
          date={date}
          onChange={(d) => {
            if (isFutureISODate(d)) {
              setDateError("We can only show integration for dates in the past.");
              return;
            }
            setDateError(null);
            setDate(d);
          }}
          title="Integration date"
          helperText="Pick Today or any past date. Future dates are unavailable."
        />

        {dateError ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text, fontWeight: "700" }}>Date not available</Text>
            <Text style={{ color: c.icon, marginTop: 6 }}>{dateError}</Text>
          </GlassCard>
        ) : null}

        {loading ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text }}>Loading {formatDisplayDate(date)}…</Text>
          </GlassCard>
        ) : null}

        {!loading && !hasAnyData ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text, fontWeight: "700" }}>No data for this date</Text>
            <Text style={{ color: c.icon, marginTop: 6 }}>
              You haven’t saved a check-in or wearable data for {formatDisplayDate(date)}.
              Try another past date or load demo data in Settings.
            </Text>
          </GlassCard>
        ) : null}

        {!loading && hasAnyData && computed ? (
          <>
            <GlassCard style={{ padding: 14 }}>
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>
                Life Balance Index: {computed.lbi.lbi} / 100
              </Text>
              <Text style={{ color: c.icon, marginTop: 6 }}>
                {computed.lbi.classification} • confidence {computed.lbi.confidence}
              </Text>
              <Text style={{ color: c.icon, marginTop: 6 }}>
                Baseline: {computed.baselineMeta.status} ({computed.baselineMeta.daysUsed} days)
              </Text>
            </GlassCard>

            <GlassCard style={{ padding: 14 }}>
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 14 }}>Signals used</Text>
              <View style={{ marginTop: 10, gap: 8 }}>
                {computed.summary.usedSignals.map((s: any) => (
                  <View key={s.key} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: c.text, flex: 1 }}>{s.label}</Text>
                    <Text style={{ color: c.icon }}>{s.source} • {Math.round(s.weightPct)}%</Text>
                  </View>
                ))}
              </View>

              {computed.summary.missingSignals.length ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>Missing</Text>
                  <Text style={{ color: c.icon, marginTop: 6 }}>
                    {computed.summary.missingSignals.join(", ")}
                  </Text>
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={{ padding: 14 }}>
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 14 }}>Coverage</Text>
              <Text style={{ color: c.icon, marginTop: 6 }}>
                Total: {computed.summary.coveragePct}% • mental: {computed.summary.mentalContributionPct}% • physiology: {computed.summary.physiologicalContributionPct}%
              </Text>
              <Text style={{ color: c.icon, marginTop: 6 }}>
                Note: if signals are missing, confidence is reduced and insights are less certain.
              </Text>
            </GlassCard>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
