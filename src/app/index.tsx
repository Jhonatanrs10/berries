// app/index.js
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import ButtonTTAPP from "../components/Jhonatanrs/ButtonTTAPP";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "../constants/Colors";
import { useColorScheme } from "../components/useColorScheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

export default function HomeScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version || "1.0.0";

  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme] ?? Colors.light;
  const insets = useSafeAreaInsets();

  // Garantia de cores válidas para evitar falha nativa no SDK 57
  const gradientColor1 = colors?.grade1 ?? "#4c669f";
  const gradientColor2 = colors?.grade2 ?? "#192f6a";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[gradientColor1, gradientColor2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <ButtonTTAPP
          imageSource={require("../assets/images/BTTAPP01.png")}
          title={t("animes")}
          onPress={() => router.push("/(animes)")}
        />
        <View style={styles.spacer} />
        <ButtonTTAPP
          imageSource={require("../assets/images/BTTAPP02.png")}
          title={t("finance")}
          onPress={() => router.push("/(finance)")}
        />
        <View style={styles.spacer} />
        <ButtonTTAPP
          imageSource={require("../assets/images/BTTAPP03.png")}
          title={t("market")}
          onPress={() => router.push("/(market)")}
        />
        <View style={styles.spacer} />
        <ButtonTTAPP
          imageSource={require("../assets/images/BTTAPP04.png")}
          title={t("todo")}
          onPress={() => router.push("/(todo)")}
        />
        <View style={styles.spacer} />

        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            alignItems: "center",
            marginTop: 50,
          }}
        >
          <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
            Copyright © {new Date().getFullYear()} Berries. {t("copyright")}.
          </Text>
          <Text style={{ color: "white", fontSize: 8 }}>
            v{version} By Jhonatanrs
          </Text>
        </View>
      </ScrollView>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative", // Garante a ancoragem do absoluteFill do gradiente
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  spacer: {
    height: 20,
  },
});
