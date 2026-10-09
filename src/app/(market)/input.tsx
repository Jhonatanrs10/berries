import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, View } from "../../components/Themed";
import CalculatorButtons from "../../components/Jhonatanrs/CalculatorButtons";
import QuantitySelector from "../../components/Jhonatanrs/QuantitySelector";
import ProductSelector from "../../components/Jhonatanrs/ProductSelector";
// 1. Importar useLocalSearchParams e useRouter
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Colors from "../../constants/Colors";
import { useColorScheme } from "../../components/useColorScheme";
import ButtonTT from "../../components/Jhonatanrs/ButtonTT";

export default function App() {
  const { t } = useTranslation();
  const router = useRouter();

  // 2. Receber parâmetros da rota de edição
  const params = useLocalSearchParams<{
    index?: string;
    product?: string;
    unitValue?: string;
    quantity?: string;
  }>();

  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<string>(
    t("input_market.product"),
  );
  const [products, setProducts] = useState<string[]>([]);
  const [history, setHistory] = useState<
    { unitValue: number; quantity: number; product: string }[]
  >([]);
  const [accumulatedTotal, setAccumulatedTotal] = useState("R$ 0,00");

  // Estado para armazenar o índice do item sendo editado
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const clearInput1 = () => setInput1("");

  // 3. Efeito para carregar e preencher os dados do item em edição quando a tela recebe o foco
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const storedHistory = await AsyncStorage.getItem("history");
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        } else {
          setHistory([]);
        }

        const savedProducts = await AsyncStorage.getItem("products");
        if (savedProducts) {
          setProducts(JSON.parse(savedProducts));
        } else {
          setProducts([]);
        }

        // Se houver parâmetros de edição vindo do histórico
        if (params.index !== undefined) {
          setEditIndex(Number(params.index));
          setSelectedProduct(params.product || t("input_market.product"));
          setInput2(params.quantity ? String(params.quantity) : "1");

          // Converte o valor unitário (float) de volta para centavos em string para o Input1
          if (params.unitValue) {
            const centavos = Math.round(parseFloat(params.unitValue) * 100);
            setInput1(centavos.toString());
          }
        }
      };

      loadData();
    }, [params.index, params.product, params.unitValue, params.quantity, t]),
  );

  useEffect(() => {
    const total = history.reduce(
      (acc, item) => acc + item.unitValue * item.quantity,
      0,
    );
    setAccumulatedTotal(
      total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    );
  }, [history]);

  const formatToCurrency = (value: string): string => {
    const numeric = value.replace(/\D/g, "");
    const number = parseFloat(numeric || "0") / 100;
    return number.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const limparFormulario = () => {
    setInput1("");
    setInput2("1");
    setSelectedProduct(t("input_market.product"));
    setEditIndex(null);
    router.setParams({
      index: undefined,
      product: undefined,
      unitValue: undefined,
      quantity: undefined,
    });
  };

  // 4. Salvar Novo ou Atualizar Item Existente
  const salvarOuAtualizarItem = async () => {
    const unitValue = parseFloat(input1.replace(/\D/g, "") || "0") / 100;
    let quantityToAdd = parseInt(input2, 10);

    if (unitValue <= 0) {
      Alert.alert(t("return.invalid_value"), t("return.invalid_value_msg"));
      return;
    }

    if (quantityToAdd === 0) {
      quantityToAdd = 1;
    }

    if (
      selectedProduct !== t("input_market.product") &&
      selectedProduct.trim() !== ""
    ) {
      const savedProducts = await AsyncStorage.getItem("products");
      const currentProducts: string[] = savedProducts
        ? JSON.parse(savedProducts)
        : [];

      if (!currentProducts.includes(selectedProduct.trim())) {
        const updatedProducts = [...currentProducts, selectedProduct.trim()];
        await AsyncStorage.setItem("products", JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
      }
    }

    const itemFormatado = {
      product: selectedProduct,
      unitValue,
      quantity: quantityToAdd,
    };
    let updatedHistory = [...history];

    if (editIndex !== null) {
      // Atualiza o item no índice especificado
      updatedHistory[editIndex] = itemFormatado;
    } else {
      // Adiciona novo item
      updatedHistory.push(itemFormatado);
    }

    setHistory(updatedHistory);

    try {
      await AsyncStorage.setItem("history", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Erro ao salvar o histórico:", error);
    }

    limparFormulario();
  };

  const handleNumberPressInput1 = (num: string) =>
    setInput1((prev) => {
      if (prev.length < 10) return prev + num;
      return prev;
    });

  const handleBackspaceInput1 = () => setInput1((prev) => prev.slice(0, -1));

  const handleQuantityChange = (newQuantity: number) => {
    setInput2(newQuantity.toString());
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: 10,
        paddingHorizontal: 0,
        backgroundColor: colors.background_primary,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background_primary,
          height: "auto",
        }}
      >
        <Text style={[styles.value, { color: colors.text_primary }]}>
          {t("input_market.total") + " "}
        </Text>
        <Text
          style={[styles.value, { color: "#007700" }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit={false}
        >
          {accumulatedTotal}
        </Text>
      </View>

      <ProductSelector
        selectedProduct={selectedProduct}
        onSelect={setSelectedProduct}
        titleText={t("input_market.search_title")}
        placeholderText={t("placeholder.product_name")}
        closeText={t("button.close")}
        addText={t("button.add")}
      />

      <QuantitySelector
        onQuantityChange={handleQuantityChange}
        initialQuantity={parseInt(input2, 10)}
      />

      <Text style={[styles.value, { color: colors.text_primary }]}>
        {input2}x {formatToCurrency(input1)}
      </Text>

      <CalculatorButtons
        onPressNumber={handleNumberPressInput1}
        onBackspace={handleBackspaceInput1}
        onStartBackspaceHold={clearInput1}
        onStopBackspaceHold={() => {}}
      />

      {editIndex !== null ? (
        <View
          style={[
            styles.editActionContainer,
            { backgroundColor: colors.background_primary },
          ]}
        >
          <Pressable
            style={[
              styles.editButton,
              { backgroundColor: colors.success, flex: 1 },
            ]}
            onPress={salvarOuAtualizarItem}
          >
            <Text style={styles.addButtonText}>
              {t("button.save") || "Salvar"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.editButton,
              {
                backgroundColor: colors.danger,
                marginLeft: 8,
                paddingHorizontal: 30,
              },
            ]}
            onPress={limparFormulario}
          >
            <Text style={styles.addButtonText}>X</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[
            styles.addButton,
            { backgroundColor: colors.success, alignSelf: "center" },
          ]}
          onPress={salvarOuAtualizarItem}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 35, textAlign: "center", marginBottom: 5 },
  addButton: {
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 0,
    marginTop: 0,
    height: 80,
    width: "90%",
    alignItems: "center",
  },
  editActionContainer: {
    flexDirection: "row",
    alignSelf: "center",
    width: "90%",
    height: 80,
    marginTop: 0,
  },
  editButton: {
    justifyContent: "center",
    borderRadius: 0,
    alignItems: "center",
    height: "100%",
  },
  addButtonText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
});
