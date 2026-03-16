import { userStorage } from "@/index";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import ReservoirIcon from "../../assets/reservoirIcon.svg";
import ScanIcon from "../../assets/scanIcon.svg";
import SprayIcon from "../../assets/sprayIcon.svg";
import { styles } from "../styles/styles";
type HistoryItem = {
  title: string;
  body: string;
  time: string;
};
type History = {
  month: string;
  days: {
    day: string;
    items: HistoryItem[];
  }[];
};
function History() {
  const [history, setHistory] = useState<History[]>([
    {
      month: "February 2026",
      days: [
        {
          day: "February 1, 2026",
          items: [
            {
              title: "Mite Check Completed",
              body: "Infestation Detected",
              time: "7:00 PM",
            },
            {
              title: "Treatment Application Failed",
              body: "Oxalic Acid",
              time: "7:00 PM",
            },
          ],
        },

        {
          day: "February 18, 2026",
          items: [
            {
              title: "Reservoir Refilled",
              body: "Oxalic Acid",
              time: "7:00 PM",
            },
            {
              title: "Treatment Applied Successfully",
              body: "Oxalic Acid",
              time: "7:00 PM",
            },
          ],
        },
      ],
    },
    {
      month: "January 2026",
      days: [
        {
          day: "January 1, 2026",
          items: [
            {
              title: "Reservoir Refilled",
              body: "Oxalic Acid",
              time: "7:00 PM",
            },
          ],
        },
        {
          day: "January 18, 2026",
          items: [
            {
              title: "Mite Check Completed",
              body: "No Infestation Detected",
              time: "7:00 PM",
            },
          ],
        },
      ],
    },
  ]);
  const generateMonths = (newest: Date, oldest: Date): History[] => {
    const months: History[] = [];

    const current = new Date(newest.getFullYear(), newest.getMonth(), 1);
    const end = new Date(oldest.getFullYear(), oldest.getMonth(), 1);

    while (current >= end) {
      months.push({
        month: current.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        }),
        days: [],
      });

      current.setMonth(current.getMonth() - 1);
    }

    return months;
  };
  const loadHistory = () => {
    const allKeys = userStorage
      .getAllKeys()
      .filter(
        (k) =>
          k !== "latestSession" &&
          !isNaN(new Date(k).getTime()) &&
          new Date(k).toISOString() === k,
      )
      .sort((a, b) => b.localeCompare(a));

    if (allKeys.length === 0) return;

    const newest = new Date(allKeys[0]);
    const oldest = new Date(allKeys[allKeys.length - 1]);

    const newHistory = generateMonths(newest, oldest);
    console.log(newest, oldest, newHistory);

    for (const key of allKeys) {
      const data = userStorage.getString(key);
      const parsed = data ? JSON.parse(data) : { title: "", body: "" };

      const dateObject = new Date(key);

      const monthLabel = dateObject.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });

      const dayLabel = dateObject.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const time = dateObject.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      const month = newHistory.find((m) => m.month === monthLabel);
      if (!month) continue;

      let day = month.days.find((d) => d.day === dayLabel);
      if (!day) {
        day = { day: dayLabel, items: [] };
        month.days.push(day);
      }

      day.items.push({
        title: parsed.title,
        body: parsed.body,
        time,
      });
    }
    console.log(newHistory);

    setHistory([
      ...newHistory,
      {
        month: "February 2026",
        days: [
          {
            day: "February 18, 2026",
            items: [
              {
                title: "Treatment Applied Successfully",
                body: "Oxalic Acid",
                time: "10:29 PM",
              },
              {
                title: "Reservoir Refilled",
                body: "Oxalic Acid",
                time: "10:23 AM",
              },
            ],
          },
          {
            day: "February 13, 2026",
            items: [
              {
                title: "Treatment Application Failed",
                body: "Oxalic Acid",
                time: "12:03 PM",
              },
              {
                title: "Mite Check Completed",
                body: "Infestation Detected",
                time: "11:59 PM",
              },
            ],
          },
        ],
      },
      {
        month: "November 2025",
        days: [
          {
            day: "November 1, 2025",
            items: [
              {
                title: "Reservoir Refilled",
                body: "Oxalic Acid",
                time: "3:12 PM",
              },
            ],
          },
          {
            day: "November 18, 2025",
            items: [
              {
                title: "Mite Check Completed",
                body: "No Infestation Detected",
                time: "3:00 PM",
              },
            ],
          },
        ],
      },
    ]);
  };
  useFocusEffect(
    useCallback(() => {
      console.log("history tab clicked");
      loadHistory();
    }, []),
  );
  const getIcon = (title: string) => {
    switch (title) {
      case "Treatment Applied Successfully":
        return (
          <View style={styles.historyIcon}>
            <SprayIcon />
          </View>
        );
      case "Treatment Application Failed":
        return (
          <View style={[styles.historyIcon, { backgroundColor: "#FFE2E5" }]}>
            <SprayIcon />
          </View>
        );
      case "Mite Check Completed":
        return (
          <View style={styles.historyIcon}>
            <ScanIcon />
          </View>
        );
      case "Reservoir Refilled":
        return (
          <View style={styles.historyIcon}>
            <ReservoirIcon />
          </View>
        );
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      <View>
        <Text style={[styles.pageTitle, { paddingLeft: 10 }]}>
          Hive History
        </Text>
      </View>
      <View>
        <Text style={[styles.subtitle, { paddingLeft: 10 }]}>
          View your hives detection and treatment history.
        </Text>
      </View>
      {/* logs */}
      <View style={{ paddingBottom: 30 }}>
        {history.map((monthlyLog, i) => (
          <View key={monthlyLog.month + i}>
            <Text style={styles.monthTitle}>{monthlyLog.month}</Text>

            {monthlyLog.days.length === 0 ? (
              <View
                style={{
                  padding: 10,
                  backgroundColor: "white",
                  borderRadius: 12,
                }}
              >
                <Text style={styles.subtitle}>No events to display</Text>
              </View>
            ) : (
              monthlyLog.days.map((dailyLog, dayIndex) => (
                <View
                  style={{
                    padding: 10,
                    gap: 6,
                    backgroundColor: "white",
                    borderRadius: 12,
                  }}
                  key={`${dailyLog.day}-${dayIndex}`}
                >
                  <View>
                    <Text>{dailyLog.day}</Text>
                  </View>
                  {dailyLog.items.map((i, itemIndex) => (
                    <View
                      key={`${dailyLog.day}-${i.time}-${itemIndex}`}
                      style={{ gap: 6 }}
                    >
                      <View>
                        <Text style={styles.timeTitle}>{i.time}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {getIcon(i.title)}
                        <View style={{ gap: 4 }}>
                          <View>
                            <Text style={{ fontWeight: 700 }}>{i.title}</Text>
                          </View>
                          <View>
                            <Text style={[styles.subtitle]}>{i.body}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default History;
