import { Platform } from "react-native";

function getSafeFileName(title: string, extension: "txt" | "json" = "txt"): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${normalized || "redacao"}.${extension}`;
}

function formatExportDate(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createWritingExportHtml(
  title: string,
  topic: string,
  content: string,
  exportedAt: Date,
): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 22mm 18mm; }
    * { box-sizing: border-box; }
    body { color: #1f2933; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.65; }
    h1 { margin: 0 0 8px; font-size: 20pt; line-height: 1.25; overflow-wrap: anywhere; }
    .metadata { margin: 0 0 22px; color: #52606d; font-size: 10pt; }
    .essay { white-space: pre-wrap; overflow-wrap: anywhere; }
    footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #d9e2ec; color: #7b8794; font-size: 9pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="metadata">Tema: ${escapeHtml(topic)}<br>Data de exportação: ${escapeHtml(formatExportDate(exportedAt))}</p>
  <main class="essay">${escapeHtml(content)}</main>
  <footer>Produzido com ENEM.DEV</footer>
</body>
</html>`;
}

export async function exportWritingText(
  title: string,
  topic: string,
  content: string,
  exportedAt: Date = new Date(),
): Promise<void> {
  const fileName = getSafeFileName(title);
  const fileContents = [
    title,
    `Tema: ${topic}`,
    `Data de exportação: ${formatExportDate(exportedAt)}`,
    "",
    content,
    "",
    "Produzido com ENEM.DEV",
  ].join("\n");

  if (Platform.OS === "web") {
    const blob = new Blob([fileContents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const [FileSystem, Sharing] = await Promise.all([
    import("expo-file-system/legacy"),
    import("expo-sharing"),
  ]);
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error("O diretório temporário para exportação não está disponível.");
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("O compartilhamento de arquivos não está disponível neste dispositivo.");
  }

  const fileUri = `${directory}${Date.now()}-${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, fileContents);
  await Sharing.shareAsync(fileUri, {
    dialogTitle: "Exportar redação",
    mimeType: "text/plain",
    UTI: "public.plain-text",
  });
}

export async function exportWritingPdf(
  title: string,
  topic: string,
  content: string,
  exportedAt: Date = new Date(),
): Promise<void> {
  const html = createWritingExportHtml(title, topic, content, exportedAt);
  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("O navegador bloqueou a janela de impressão. Permita pop-ups para exportar o PDF.");
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    window.setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
      }
    }, 250);
    return;
  }

  const Print = await import("expo-print");
  const file = await Print.printToFileAsync({ html });
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("O compartilhamento de arquivos não está disponível neste dispositivo.");
  }
  await Sharing.shareAsync(file.uri, {
    dialogTitle: "Exportar redação em PDF",
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });
}

export async function exportWritingJson(
  title: string,
  content: string,
): Promise<void> {
  const fileName = getSafeFileName(title, "json");

  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const [FileSystem, Sharing] = await Promise.all([
    import("expo-file-system/legacy"),
    import("expo-sharing"),
  ]);
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error("O diretório temporário para exportação não está disponível.");
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("O compartilhamento de arquivos não está disponível neste dispositivo.");
  }

  const fileUri = `${directory}${Date.now()}-${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, content);
  await Sharing.shareAsync(fileUri, {
    dialogTitle: "Exportar temas personalizados",
    mimeType: "application/json",
    UTI: "public.json",
  });
}
