"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Bell, X, Megaphone, MessageCircle } from "lucide-react";
import { useConfig } from "@/lib/contexts/PublicDataContext";

function AnnouncementBody({
  banner,
  badge,
  title,
  content,
}: {
  banner: string;
  badge: string;
  title: string;
  content: string;
}) {
  return (
    <div className="max-h-[68vh] overflow-y-auto">
      {/* Cover / Banner */}
      <div className="relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-brand-green via-brand-green-600 to-brand-green-700 overflow-hidden">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt={title || "ประกาศ"} className="h-full w-full object-cover" />
        ) : (
          <Megaphone className="h-12 w-12 text-white/90 drop-shadow" />
        )}
        {badge && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-surface/95 px-2.5 py-0.5 text-[10px] font-black text-brand-green shadow-sm">
            {badge}
          </span>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5">
        {title && (
          <h3 className="flex items-start gap-1.5 text-[15px] font-black leading-snug text-brand-ink">
            📢 {title}
          </h3>
        )}
        {content && (
          <div
            className="mt-2.5 text-[12.5px] font-medium leading-relaxed text-brand-ink-soft
              [&_h2]:text-base [&_h2]:font-black [&_h2]:text-brand-ink [&_h2]:mt-3 [&_h2]:mb-1.5
              [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-brand-ink [&_h3]:mt-2.5 [&_h3]:mb-1
              [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
              [&_li]:mb-1 [&_a]:text-brand-green [&_a]:underline
              [&_strong]:text-brand-ink [&_b]:text-brand-ink
              [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green-100 [&_blockquote]:pl-3 [&_blockquote]:my-2"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  );
}

/** ปุ่มท้ายประกาศ — "ปิดประกาศ" (เขียว) + "ติดต่อเรา" (outline + LINE) */
function AnnouncementFooter({
  contactLink,
  onClose,
}: {
  contactLink: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-stretch gap-2 border-t border-brand-green-100 bg-brand-surface-soft p-2.5">
      <button
        onClick={onClose}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-green to-brand-green-600 py-3 text-[13px] font-black text-white shadow-md shadow-brand-green/25 transition hover:brightness-110 cursor-pointer"
      >
        ปิดประกาศ
      </button>
      {contactLink && (
        <a
          href={contactLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-green-100 bg-brand-surface px-4 py-3 text-[13px] font-black text-brand-green transition hover:border-brand-green hover:bg-brand-green-50 cursor-pointer"
        >
          <Image
      src="https://thesvg.org/icons/line/default.svg"
      alt="LINE"
      width={24}
      height={24}
    />
          ติดต่อเรา
        </a>
      )}
    </div>
  );
}

export default function AnnouncementBell() {
  const { config } = useConfig();

  const banner = (config.announceBanner ?? "").trim();
  const badge = (config.announceBadge ?? "").trim();
  const title = (config.announceTitle ?? "").trim();
  const content = config.announceContent ?? "";
  const contactLink = (config.contactLine ?? "").trim();
  const hasContent =
    !!title || !!banner || content.replace(/<[^>]*>/g, "").trim().length > 0;
  const enabled = !!config.announceEnabled && hasContent;

  const [panelOpen, setPanelOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  /* แสดงประกาศทุกครั้งที่เข้าหน้า (ไม่มีระบบรับทราบ/ซ่อน 1 วัน) */
  useEffect(() => {
    setPopupOpen(enabled);
    setUnread(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [panelOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanelOpen(false);
        setPopupOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!enabled) return null;

  /* ปิดเฉพาะตอนนี้ — ไม่จำสถานะ จะกลับมาแสดงอีกเมื่อเข้าหน้าใหม่ */
  const close = () => {
    setPopupOpen(false);
    setPanelOpen(false);
    setUnread(false);
  };

  return (
    <>
      {/* ── กระดิ่งมุมขวาบน ── */}
      <div className="fixed right-4 top-[88px] z-[70] sm:right-6">
        <button
          ref={btnRef}
          type="button"
          onClick={() => {
            setPanelOpen((o) => !o);
            setUnread(false);
          }}
          aria-label="ประกาศจากระบบ"
          aria-expanded={panelOpen}
          className={`relative ml-auto flex h-13 w-13 items-center justify-center rounded-full border border-brand-green-100 bg-brand-surface/90 shadow-lg shadow-black/40 ring-1 ring-brand-green/15 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-brand-green active:scale-95 cursor-pointer ${
            unread ? "animate-pulse-ring" : ""
          }`}
        >
          <Bell
            className={`h-6 w-6 text-brand-gold ${
              unread && !panelOpen ? "animate-bell-swing" : ""
            }`}
            strokeWidth={2.3}
            fill="currentColor"
          />
          {unread && (
            <span className="absolute right-3 top-3 h-3 w-3 rounded-full border-2 border-brand-surface bg-rose-500 animate-pulse" />
          )}
        </button>

        {panelOpen && (
          <div
            ref={panelRef}
            className="animate-announce-panel-in absolute right-0 top-16 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-2xl border border-brand-green-100 bg-brand-surface shadow-2xl shadow-black/50 ring-1 ring-brand-green/15"
          >
            <div className="flex items-center justify-between gap-2 border-b border-brand-green-100/60 px-4 py-3">
              <span className="flex items-center gap-2 text-[14px] font-black text-brand-green">
                <Megaphone className="h-4 w-4" /> ประกาศจากระบบ
              </span>
              <button
                onClick={() => setPanelOpen(false)}
                aria-label="ปิด"
                className="flex h-7 w-7 items-center justify-center rounded-full text-brand-ink-soft transition hover:bg-brand-surface-soft hover:text-brand-ink cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AnnouncementBody banner={banner} badge={badge} title={title} content={content} />
            <AnnouncementFooter contactLink={contactLink} onClose={close} />
          </div>
        )}
      </div>

      {/* ── Popup กลางจอ (เด้งตอนเข้าเว็บ) ── */}
      {popupOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={close}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-brand-green-100 bg-brand-surface shadow-2xl shadow-black/60 ring-1 ring-brand-green/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-2 border-b border-brand-green-100/60 px-5 py-3.5">
              <span className="flex items-center gap-2 text-[15px] font-black text-brand-green">
                <Megaphone className="h-4.5 w-4.5" /> ประกาศจากระบบ
              </span>
              <button
                onClick={close}
                aria-label="ปิด"
                className="flex h-8 w-8 items-center justify-center rounded-full text-brand-ink-soft transition hover:bg-brand-surface-soft hover:text-brand-ink cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <AnnouncementBody banner={banner} badge={badge} title={title} content={content} />
            <AnnouncementFooter contactLink={contactLink} onClose={close} />
          </div>
        </div>
      )}
    </>
  );
}
