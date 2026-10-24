import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

interface FilterOption {
  label: string;
  value: string;
}

export function FilterOptionGroup({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <View style={styles.group} accessibilityRole="radiogroup">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => onSelect(option.value)}
              onFocus={() => setFocusedValue(option.value)}
              onBlur={() =>
                setFocusedValue((current) =>
                  current === option.value ? null : current,
                )
              }
              onHoverIn={() => setHoveredValue(option.value)}
              onHoverOut={() =>
                setHoveredValue((current) =>
                  current === option.value ? null : current,
                )
              }
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.selectedOption,
                focusedValue === option.value && styles.focusedOption,
                hoveredValue === option.value && styles.hoveredOption,
                pressed && !reduceMotion && styles.pressedOption,
              ]}
            >
              <Text
                style={[styles.optionText, isSelected && styles.selectedText]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 7,
  },
  label: {
    color: "#8B949E",
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  option: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#30363D",
    borderRadius: 7,
    backgroundColor: "#0D1117",
  },
  selectedOption: {
    borderColor: "#58A6FF",
    backgroundColor: "#58A6FF18",
  },
  focusedOption: {
    borderWidth: 2,
    borderColor: "#E6EDF3",
  },
  hoveredOption: {
    backgroundColor: "#58A6FF24",
  },
  pressedOption: {
    transform: [{ scale: 0.98 }],
  },
  optionText: {
    color: "#8B949E",
    fontSize: 10,
    fontWeight: "600",
  },
  selectedText: {
    color: "#58A6FF",
  },
});
