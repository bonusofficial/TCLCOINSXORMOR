import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** รับเฉพาะตัวเลขและตัดความยาวเบอร์โทรไว้สูงสุด 10 หลัก */
export function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      // ต้องรอให้เขียนสำเร็จจริง มิฉะนั้น UI จะขึ้นว่าสำเร็จทั้งที่คลิปบอร์ด
      // ยังเป็นข้อความเก่า โดยเฉพาะ Safari และ in-app browser บนมือถือ
      await navigator.clipboard.writeText(text);
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
    textArea.setAttribute("readonly", "");

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

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
