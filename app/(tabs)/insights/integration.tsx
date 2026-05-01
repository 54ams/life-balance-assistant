import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { FlipCard } from "@/components/ui/FlipCard";
import { WorkingPanel } from "@/components/ui/WorkingPanel";
import { ShowWorkingToggle } from "@/components/ui/ShowWorkingToggle";
import { useShowWorking } from "@/hooks/useShowWorking";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";

import { calculateLBI } from "@/lib/lbi";
import { computeIntegrationSummary } from "@/lib/integration";
import { computeBaselineMeta, type BaselineMeta } from "@/lib/baseline";
import { getDay, getWearableDays } from "@/lib/storage";
import { formatDisplayDate } from "@/lib/date";
import type { ISODate } from "@/lib/types";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";

import { todayISO } from "@/lib/util/todayISO";
import AsyncStorage from "@react-native-async-storage/async-storage";

function isFutureISODate(s: ISODate): boolean {
  return s > todayISO();
}

export default function IntegrationScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [date, setDate] = useState<ISODate>(todayISO());
  const [dateError, setDateError] = useState<string | null>(null);

  const [record, setRecord] = useState<any>(null);
  const [baselineMeta, setBaselineMeta] = useState<BaselineMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [whoopConnected, setWhoopConnected] = useState(false);
  const [whoopLastSynced, setWhoopLastSynced] = useState<string | null>(null);
  const [whoopDays, setWhoopDays] = useState<number>(0);
  const working = useShowWorking(false);

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
        const [d, meta] = await Promise.all([getDay(date), computeBaselineMeta(7)]);
        setRecord(d);
        setBaselineMeta(meta);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  // WHOOP status and coverage
  useEffect(() => {
    (async () => {
      const sess = await AsyncStorage.getItem("whoop_session_token");
      const last = await AsyncStorage.getItem("whoop_last_sync");
      setWhoopConnected(!!sess);
      setWhoopLastSynced(last);
      const days = await getWearableDays();
      const recentWhoop = days.filter((d) => String(d.source).startsWith("whoop"));
      setWhoopDays(recentWhoop.slice(-7).length);
    })();
  }, []);

  const computed = useMemo(() => {
    if (!record) return null;

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

    return { lbi, summary };
  }, [record]);

  const hasAnyData = !!(record?.checkIn || record?.wearable);

  return (
    <Screen>
      <ScreenHeader
        title="Integration"
        subtitle="How complete your data is for a specific date"
        fallback="/insights"
      />
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
            <Text style={{ color: c.text.primary, fontWeight: "700" }}>Date not available</Text>
            <Text style={{ color: c.text.tertiary, marginTop: 6 }}>{dateError}</Text>
          </GlassCard>
        ) : null}

        {loading ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text.primary }}>Loading {formatDisplayDate(date)}…</Text>
          </GlassCard>
        ) : null}

        <GlassCard style={{ padding: 14 }}>
          <Text style={{ color: c.text.primary, fontWeight: "800" }}>WHOOP status</Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            {whoopConnected ? "Connected" : "Not connected"} • Last synced: {whoopLastSynced ?? "—"}
          </Text>
          <Text style={{ color: c.text.secondary, marginTop: 4 }}>
            WHOOP days in last 7: {whoopDays}/7
          </Text>
          <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
            Data imported from WHOOP. Correlation ≠ causation.
          </Text>
        </GlassCard>

        {!loading && !hasAnyData ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text.primary, fontWeight: "700" }}>No data for this date</Text>
            <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
              You haven’t saved a check-in or wearable data for {formatDisplayDate(date)}.
              Try another past date or load demo data in Settings.
            </Text>
          </GlassCard>
        ) : null}

        {!loading && hasAnyData && computed ? (
          <>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <ShowWorkingToggle value={working.globalShow} onToggle={working.toggleGlobal} />
            </View>

            <FlipCard
              flipped={working.isFlipped("lbi")}
              onToggle={() => working.toggleTile("lbi")}
              accessibilityLabel={`Balance score ${computed.lbi.lbi}. Tap to ${working.isFlipped("lbi") ? "hide" : "show"} the maths.`}
              front={
                <GlassCard style={{ padding: 14 }}>
                  <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>
                    Life Balance Index: {computed.lbi.lbi} / 100
                  </Text>
                  <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
                    {computed.lbi.classification} • confidence {computed.lbi.confidence}
                  </Text>
                  <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
                    Building your baseline ({baselineMeta?.daysUsed ?? 0} of {baselineMeta?.targetDays ?? 7} days so far)
                  </Text>
                  <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 10, textAlign: "right", fontWeight: "600" }}>
                    Tap to show the maths
                  </Text>
                </GlassCard>
              }
              back={
                <WorkingPanel
                  summary="How your balance score for this day was put together."
                  inputs={[
                    `Recovery sub-score: ${Math.round(computed.lbi.subscores.recovery)} / 100`,
                    `Sleep sub-score: ${Math.round(computed.lbi.subscores.sleep)} / 100`,
                    `Mood sub-score: ${Math.round(computed.lbi.subscores.mood)} / 100`,
                    `Stress sub-score: ${Math.round(computed.lbi.subscores.stress)} / 100`,
                  ]}
                  method="Body side (recovery + sleep, weighted equally) counts for 70%. Mind side (mood + stress, weighted equally) counts for 30%. Add them up, round to a whole number."
                  result={`Balance score ${computed.lbi.lbi} / 100 · ${computed.lbi.classification} · confidence ${computed.lbi.confidence}`}
                  footnote={`Building your baseline — using ${baselineMeta?.daysUsed ?? 0} of ${baselineMeta?.targetDays ?? 7} days so far.`}
                />
              }
            />

            <GlassCard style={{ padding: 14 }}>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>Signals used</Text>
              <View style={{ marginTop: 10, gap: 8 }}>
                {computed.summary.usedSignals.map((s: any) => (
                  <View key={s.key} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: c.text.primary, flex: 1 }}>{s.label}</Text>
                    <Text style={{ color: c.text.tertiary }}>{s.source} • {Math.round(s.weightPct)}%</Text>
                  </View>
                ))}
              </View>

              {computed.summary.missingSignals.length ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: c.text.primary, fontWeight: "700" }}>Missing</Text>
                  <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
                    {computed.summary.missingSignals.map((s: any) => s.label).join(", ")}
                  </Text>
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={{ padding: 14 }}>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>Data completeness</Text>
              <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
                Total: {computed.summary.coveragePct}% • mental: {computed.summary.mentalContributionPct}% • physical: {computed.summary.physiologicalContributionPct}%
              </Text>
              <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
                Note: if signals are missing, confidence is reduced and insights are less certain.
              </Text>
            </GlassCard>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
