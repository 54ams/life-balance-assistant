import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDisplayDate } from "@/lib/date";
import { parseNormalizedWearableCsv } from "@/lib/import/normalizedCsv";
import { saveWearableDays } from "@/lib/storage";

export default function ImportWearablesScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [imported, setImported] = useState(false);

  const canPreview = csv.trim().length > 0;

  const onPreview = () => {
    const result = parseNormalizedWearableCsv(csv);
    setPreview(result.days.slice(0, 5));
    setErrors(result.errors);
    setImported(false);
  };

  const onImport = async () => {
    const result = parseNormalizedWearableCsv(csv);
    if (result.errors.length > 0) return;
    await saveWearableDays(result.days);
    setImported(true);
  };

  const headerHint = useMemo(
    () => "Date format: dd-mmm-yy (e.g. 01-Jan-26)",
    []
  );

  return (
    <Screen scroll>
      <Text style={{ fontSize: 22, fontWeight: "700", color: c.text }}>
        Import wearable CSV
      </Text>
      <Text style={{ marginTop: 6, color: c.muted }}>{headerHint}</Text>

      <View style={{ marginTop: 16, gap: 12 }}>
        <GlassCard>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
            Paste CSV
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            Supported fields: date, sleepHours, recovery, ...
          </Text>

          <TextInput
            value={csv}
            onChangeText={setCsv}
            placeholder="Paste CSV here…"
            placeholderTextColor={c.muted}
            multiline
            style={{
              marginTop: 12,
              minHeight: 160,
              borderRadius: 14,
              padding: 12,
              fontSize: 13,
              textAlignVertical: "top",
              color: c.text,
              backgroundColor:
                scheme === "dark"
                  ? "rgba(0,0,0,0.18)"
                  : "rgba(255,255,255,0.55)",
              borderWidth: 1,
              borderColor: c.glassBorder ?? c.border,
            }}
          />

          <View style={{ marginTop: 12 }}>
            <Button title="Preview" onPress={onPreview} disabled={!canPreview} />
          </View>
        </GlassCard>

        {errors.length > 0 && (
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>
              Errors
            </Text>
            <View style={{ marginTop: 8, gap: 6 }}>
              {errors.map((e: any, i: number) => (
                <Text key={i} style={{ color: c.danger, fontSize: 12 }}>
                  Row {e.row}: {e.message}
                </Text>
              ))}
            </View>
          </GlassCard>
        )}

        {preview.length > 0 && errors.length === 0 && (
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>
              Preview (first 5 rows)
            </Text>
            <View style={{ marginTop: 8, gap: 6 }}>
              {preview.map((d: any, i: number) => (
                <Text key={i} style={{ color: c.muted }}>
                  {formatDisplayDate(d.date)} — sleep {d.sleepHours}h, recovery{" "}
                  {d.recovery}
                </Text>
              ))}
            </View>

            <View style={{ marginTop: 12 }}>
              <Button
                title={imported ? "Imported ✓" : "Import"}
                variant={imported ? "secondary" : "primary"}
                onPress={onImport}
              />
            </View>

            {imported ? (
              <View style={{ marginTop: 10 }}>
                <Button
                  title="Back"
                  variant="ghost"
                  onPress={() => router.back()}
                />
              </View>
            ) : null}
          </GlassCard>
        )}
      </View>
    </Screen>
  );
}
