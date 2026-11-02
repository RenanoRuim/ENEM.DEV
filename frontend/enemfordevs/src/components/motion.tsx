import { useState, type PropsWithChildren } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useIsFocused } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { useMotionEnabled } from "@/hooks/use-theme";

export const MOTION_DURATION = {
  press: 100,
  feedback: 40,
  quick: 140,
  screen: 160,
  entry: 220,
  authEntry: 320,
  authFeedback: 420,
  selection: 240,
  modal: 180,
  progress: 420,
  xp: 300,
} as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MotionViewProps = Omit<
  React.ComponentProps<typeof Animated.View>,
  "entering" | "exiting"
> & {
  entrance?: "card" | "fade" | "modal" | false;
  enterDelay?: number;
exit?: "fade" | "modal" | false;
};

export function MotionView({
entrance = "card",
enterDelay = 0,
exit = false,
...props
}: MotionViewProps) {
const enabled = useMotionEnabled();
const entering =
    enabled && entrance
      ? entrance === "modal"
        ? ZoomIn.duration(MOTION_DURATION.modal)
        : entrance === "fade"
          ? FadeIn.duration(MOTION_DURATION.entry)
          : FadeInDown.delay(enterDelay).duration(MOTION_DURATION.entry)
      : undefined;
  const exiting =
    enabled && exit
      ? exit === "modal"
        ? ZoomOut.duration(MOTION_DURATION.modal)
        : FadeOut.duration(MOTION_DURATION.modal)
      : undefined;

  return <Animated.View {...props} entering={entering} exiting={exiting} />;
}

export function MotionScreen({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const enabled = useMotionEnabled();
  const focused = useIsFocused();
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: enabled
        ? withTiming(focused ? 1 : 0, { duration: MOTION_DURATION.screen })
        : 1,
      transform: [
        {
          translateY: enabled
            ? withTiming(focused ? 0 : 4, {
                duration: MOTION_DURATION.screen,
              })
            : 0,
        },
      ],
    }),
    [enabled, focused],
  );

  return (
    <Animated.View
      accessibilityElementsHidden={!focused}
      importantForAccessibility={
        focused ? "auto" : "no-hide-descendants"
      }
      pointerEvents={focused ? "auto" : "none"}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

export function MotionPressable({
  onPressIn,
  onPressOut,
  style,
  ...props
}: PressableProps) {
  const enabled = useMotionEnabled();
  const [pressed, setPressed] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(enabled && pressed ? 0.98 : 1, {
          duration: MOTION_DURATION.press,
        }),
      },
    ],
  }), [enabled, pressed]);

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={(state: PressableStateCallbackType) => [
        typeof style === "function" ? style(state) : style,
        enabled ? animatedStyle : undefined,
      ]}
    />
  );
}

export function MotionProgressFill({
  progress,
  style,
}: {
  progress: number;
  style?: StyleProp<ViewStyle>;
}) {
  const enabled = useMotionEnabled();
  const boundedProgress = Math.max(0, Math.min(100, progress));
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${enabled
      ? withTiming(boundedProgress, { duration: MOTION_DURATION.progress })
      : boundedProgress}%`,
  }), [boundedProgress, enabled]);

  return <Animated.View style={[style, animatedStyle]} />;
}
