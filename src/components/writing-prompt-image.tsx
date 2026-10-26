import { X } from "lucide-react-native";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getWritingPromptImageUri } from "@/services/writing-prompt-images";
import type { WritingPromptImage } from "@/types/writing";

const colors = {
  background: "#0D1117",
  surface: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  blue: "#58A6FF",
};

export function WritingPromptImageView({
  image,
  thumbnail = false,
}: {
  image: WritingPromptImage;
  thumbnail?: boolean;
}) {
  const [loadedImage, setLoadedImage] = useState<{
    id: string;
    uri?: string;
    error?: string;
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    void getWritingPromptImageUri(image.id, image.mimeType).then(
      (nextUri) => {
        if (active) {
          setLoadedImage({ id: image.id, uri: nextUri });
        }
      },
      (loadError: unknown) => {
        if (active) {
          setLoadedImage({
            id: image.id,
            error:
              loadError instanceof Error
                ? loadError.message
                : "Não foi possível carregar esta imagem.",
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [image.id, image.mimeType]);

  const currentImage = loadedImage?.id === image.id ? loadedImage : null;
  const uri = currentImage?.uri ?? null;
  const error = currentImage?.error ?? null;

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }
  if (!uri) {
    return <ActivityIndicator color={colors.blue} />;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ampliar imagem: ${image.description || image.fileName}`}
        onPress={() => setIsExpanded(true)}
        style={thumbnail ? styles.thumbnailButton : styles.imageButton}
      >
        <Image
          contentFit={thumbnail ? "cover" : "contain"}
          source={{ uri }}
          style={thumbnail ? styles.thumbnail : styles.image}
        />
      </Pressable>
      {!thumbnail && image.description ? (
        <Text style={styles.description}>{image.description}</Text>
      ) : null}
      {!thumbnail && image.source ? (
        <Text style={styles.source}>Fonte: {image.source}</Text>
      ) : null}
      <Modal
        animationType="fade"
        onRequestClose={() => setIsExpanded(false)}
        statusBarTranslucent
        transparent
        visible={isExpanded}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar imagem ampliada"
            onPress={() => setIsExpanded(false)}
            style={styles.closeButton}
          >
            <X color={colors.text} size={22} />
          </Pressable>
          <Image contentFit="contain" source={{ uri }} style={styles.expandedImage} />
          {image.description || image.source ? (
            <View style={styles.caption}>
              {image.description ? (
                <Text style={styles.description}>{image.description}</Text>
              ) : null}
              {image.source ? (
                <Text style={styles.source}>Fonte: {image.source}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumbnailButton: {
    width: 104,
    height: 80,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
  },
  thumbnail: { width: "100%", height: "100%" },
  imageButton: {
    width: "100%",
    maxWidth: 520,
    height: 240,
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  image: { width: "100%", height: "100%" },
  error: { color: "#F85149", fontSize: 11, lineHeight: 16 },
  description: { color: colors.text, fontSize: 12, lineHeight: 18 },
  source: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#000000EE",
  },
  closeButton: {
    position: "absolute",
    zIndex: 1,
    top: 24,
    right: 20,
    padding: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  expandedImage: {
    width: "100%",
    height: "78%",
    maxWidth: 1100,
  },
  caption: {
    width: "100%",
    maxWidth: 900,
    paddingTop: 12,
    gap: 5,
  },
});
