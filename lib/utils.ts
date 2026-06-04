import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      void navigator.clipboard.writeText(text).catch((err) => {
        console.error("Clipboard write failed: ", err);
      });
      return true;
    } catch (err) {
      console.error("Clipboard write failed: ", err);
    }
  }

  // Fallback for insecure contexts (HTTP) or older browsers/LINE webview
  let textArea: HTMLTextAreaElement | null = null;
  try {
    textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand("copy");
    return successful;
  } catch (err) {
    console.error("Fallback copy failed: ", err);
    return false;
  } finally {
    if (textArea?.parentNode) {
      textArea.parentNode.removeChild(textArea);
    }
  }
}
