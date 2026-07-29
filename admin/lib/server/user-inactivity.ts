export const NEAR_EXPIRY_DAYS = 25;
export const EXPIRY_DAYS = 30;

export type UserActivityStatus =
  | "normal"
  | "near_expiry"
  | "expired"
  | "exempt";

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateUserActivity(
  createdAt: Date,
  lastBookingAt: Date | null,
  now = new Date(),
  role: string | null = null
) {
  const activityReferenceAt = lastBookingAt ?? createdAt;
  const isAdmin = role?.trim().toLowerCase() === "admin";

  if (isAdmin) {
    return {
      activityStatus: "exempt" as const,
      activityStatusLabel: "ยกเว้นการนับ",
      inactivityDays: null,
      daysUntilExpiry: null,
      expiresAt: null,
      lastBookingAt: lastBookingAt?.toISOString() ?? null,
      activityReferenceAt: activityReferenceAt.toISOString(),
      requiresDeletionReview: false,
    };
  }

  const inactivityDays = Math.max(
    0,
    Math.floor((now.getTime() - activityReferenceAt.getTime()) / DAY_MS)
  );
  const activityStatus: UserActivityStatus =
    inactivityDays >= EXPIRY_DAYS
      ? "expired"
      : inactivityDays >= NEAR_EXPIRY_DAYS
        ? "near_expiry"
        : "normal";

  return {
    activityStatus,
    activityStatusLabel:
      activityStatus === "expired"
        ? "ครบกำหนดแล้ว"
        : activityStatus === "near_expiry"
          ? "ใกล้ครบกำหนด"
          : "ปกติ",
    inactivityDays,
    daysUntilExpiry: Math.max(0, EXPIRY_DAYS - inactivityDays),
    expiresAt: new Date(
      activityReferenceAt.getTime() + EXPIRY_DAYS * DAY_MS
    ).toISOString(),
    lastBookingAt: lastBookingAt?.toISOString() ?? null,
    activityReferenceAt: activityReferenceAt.toISOString(),
    requiresDeletionReview: activityStatus === "expired",
  };
}
