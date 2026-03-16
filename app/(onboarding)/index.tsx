import { userStorage } from "@/index";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import OnboardingBackground from "../components/OnboardingBackground";
import OnboardingDetection from "../components/OnboardingDetection";
import OnboardingFinal from "../components/OnboardingFinal";
import OnboardingSolution from "../components/OnboardingSolution";
import OnboardingTreatment from "../components/OnboardingTreatment";
import OnboardingWelcome from "../components/OnboardingWelcome";
import { COLOURS } from "../styles/styles";
const { width } = Dimensions.get("window");

const pages = [
  {
    key: "welcome",
    Component: OnboardingWelcome,
  },
  {
    key: "background",
    Component: OnboardingBackground,
  },
  {
    key: "detection",
    Component: OnboardingDetection,
  },
  {
    key: "treatment",
    Component: OnboardingTreatment,
  },
  {
    key: "solution",
    Component: OnboardingSolution,
  },
  {
    key: "final",
    Component: OnboardingFinal,
  },
];

export default function Onboarding() {
  const flatListRef = useRef<FlatList>(null);
  const [page, setPage] = useState(0);

  const finishOnboarding = async () => {
    userStorage.set("onboarding", true);
    router.replace("/(tabs)");
  };

  const nextPage = () => {
    if (page < pages.length - 1) {
      flatListRef.current?.scrollToIndex({ index: page + 1 });
    } else {
      finishOnboarding();
    }
  };

  const prevPage = () => {
    if (page > 0) {
      flatListRef.current?.scrollToIndex({ index: page - 1 });
    }
  };

  const renderItem = ({
    item,
  }: {
    item: {
      key: string;
      Component: () => React.JSX.Element;
    };
  }) => {
    const Page = item.Component;
    return <Page />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              {
                backgroundColor: i <= page ? "orange" : "#ccc",
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.progressText}>
        <Text>
          {page + 1} of {pages.length}
        </Text>
        {page < pages.length - 1 && (
          <Text
            onPress={() =>
              flatListRef.current?.scrollToIndex({ index: pages.length - 1 })
            }
          >
            Skip to Set Up
          </Text>
        )}
      </View>
      <FlatList
        ref={flatListRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(index);
        }}
        renderItem={renderItem}
      />
      <View
        style={{
          flexDirection: "row",
          marginBottom: 50,
          width: "90%",
          alignSelf: "center",
          justifyContent: "space-around",
        }}
      >
        {/* Back button */}
        {page > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={prevPage}>
            <Text style={{ color: "black", fontWeight: 600 }}>Back</Text>
          </TouchableOpacity>
        )}
        {/* Next button */}
        <TouchableOpacity style={styles.nextButton} onPress={nextPage}>
          <Text style={{ color: "white", fontWeight: 600 }}>
            {page == pages.length - 1 ? "Finish" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },

  page: {
    width,
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  text: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "black",
    marginHorizontal: 6,
  },

  backButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderColor: "#C5C6CC",
    borderWidth: 1,
    alignItems: "center",
    width: "40%",
  },
  nextButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLOURS.colour3,
    alignItems: "center",
    width: "40%",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    marginTop: 84,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    marginHorizontal: 2, // space between segments
    borderRadius: 2,
  },
  progressText: {
    marginHorizontal: 20,
    marginTop: 5,
    color: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  tag: {
    backgroundColor: "#FFF7E6",
    paddingHorizontal: 10,
    paddingBlock: 5,
    borderRadius: 100,
    alignItems: "center",
    display: "flex",
    alignSelf: "flex-start",
    marginTop: 20,
    marginBottom: 12.5,
  },
  tagText: { color: COLOURS.colour3, fontWeight: 500 },
  h1: {
    fontWeight: 800,
    fontSize: 24,
    width: "75%",
    marginBottom: 7.5,
  },
  h2: {
    fontWeight: 700,
    lineHeight: 20,
    fontSize: 16,
    marginBottom: 4,
  },
  body: {
    color: "#717182",
  },
  helpPrompt: {
    backgroundColor: "#F9F9FB",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    color: "#717182",
    marginTop: 20,
    gap: 10,
  },
});
