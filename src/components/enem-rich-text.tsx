import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  isUnavailableImageUrl,
  isValidImageUrl,
} from "@/utils/question-validation";

type ImageStatus = "loading" | "loaded" | "error";

const imageMarkdownPattern = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const formattingPattern = /(\*\*|__|~~|`|\*|_)/g;
const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const noImages: string[] = [];

function cleanMarkdownText(text: string) {
  return text
    .replace(markdownLinkPattern, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(formattingPattern, "");
}

export function EnemRichText({
  content,
  imageUrls = noImages,
  onImageStatusChange,
}: {
  content: string | null;
  imageUrls?: string[];
  onImageStatusChange?: (uri: string, status: ImageStatus) => void;
}) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>(
    {},
  );
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const segments = content?.split(imageMarkdownPattern);
  const textSegments: string[] = [];

  if (segments) {
    for (let index = 0; index < segments.length; index += 1) {
      if (index % 3 === 0) {
        textSegments.push(segments[index]);
      }
    }
  }

  const images = useMemo(
    () => {
      const parts = content?.split(imageMarkdownPattern) ?? [];
      const markdownImages = parts.filter(
        (_, index) => index % 3 === 2,
      );
      return [
        ...new Set([...markdownImages, ...imageUrls]),
      ].filter(
        (uri): uri is string =>
          typeof uri === "string" && isValidImageUrl(uri),
      );
    },
    [content, imageUrls],
  );
  const text = cleanMarkdownText(textSegments.join(""));

  useEffect(() => {
    for (const uri of images) {
      if (isUnavailableImageUrl(uri)) {
        onImageStatusChange?.(uri, "error");
      }
    }
  }, [images, onImageStatusChange]);

  if (!text.trim() && images.length === 0) {
    return <Text style={styles.text}>Enunciado não disponível.</Text>;
  }

  return (
    <View style={styles.content}>
      {text.trim() ? <Text style={styles.text}>{text.trim()}</Text> : null}
      {images.map((uri) => {
        const sourceUnavailable = isUnavailableImageUrl(uri);
        const failed = sourceUnavailable || failedImages[uri] === true;

        return (
          <View key={uri} style={styles.imageContainer}>
            {failed ? (
              <View style={styles.imageFallback}>
                <Text style={styles.imageFallbackText}>
                  {sourceUnavailable
                    ? "A API não disponibilizou esta imagem."
                    : "Não foi possível carregar esta imagem."}
                </Text>
                {!sourceUnavailable ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setFailedImages((current) => ({
                        ...current,
                        [uri]: false,
                      }));
                      setRetryCounts((current) => ({
                        ...current,
                        [uri]: (current[uri] ?? 0) + 1,
                      }));
                    }}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryButtonText}>
                      Tentar carregar novamente
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Image
                key={`${uri}:${retryCounts[uri] ?? 0}`}
                source={{ uri }}
                contentFit="contain"
                accessibilityLabel="Imagem da questão"
                style={styles.image}
                onLoadStart={() => onImageStatusChange?.(uri, "loading")}
                onLoad={() => {
                  setFailedImages((current) => ({
                    ...current,
                    [uri]: false,
                  }));
                  onImageStatusChange?.(uri, "loaded");
                }}
                onError={() => {
                  setFailedImages((current) => ({
                    ...current,
                    [uri]: true,
                  }));
                  onImageStatusChange?.(uri, "error");
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  text: {
    color: "#E6EDF3",
    fontSize: 13,
    lineHeight: 21,
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 8,
    backgroundColor: "#0D1117",
  },
  imageContainer: {
    width: "100%",
  },
  imageFallback: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#30363D",
    borderRadius: 8,
    backgroundColor: "#0D1117",
  },
  imageFallbackText: {
    color: "#8B949E",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: "#30363D",
  },
  retryButtonText: {
    color: "#E6EDF3",
    fontSize: 11,
    fontWeight: "600",
  },
});
