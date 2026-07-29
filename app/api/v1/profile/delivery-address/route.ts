import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DeliveryAddressBody = {
  phone?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  addressLine?: unknown;
  subdistrict?: unknown;
  district?: unknown;
  province?: unknown;
  postalCode?: unknown;
};

type DeliveryAddress = {
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  addressLine: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
};

const deliveryAddressSelect = {
  phone: true,
  firstName: true,
  lastName: true,
  addressLine: true,
  subdistrict: true,
  district: true,
  province: true,
  postalCode: true,
} as const;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function readDeliveryAddress(userId: string): Promise<DeliveryAddress | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: deliveryAddressSelect,
    });
  } catch (prismaError) {
    console.warn(
      "[profile/delivery-address] Prisma model read failed; using SQL fallback",
      prismaError
    );
    const rows = await prisma.$queryRaw<DeliveryAddress[]>`
      SELECT
        \`phone\`,
        \`firstName\`,
        \`lastName\`,
        \`addressLine\`,
        \`subdistrict\`,
        \`district\`,
        \`province\`,
        \`postalCode\`
      FROM \`user\`
      WHERE \`id\` = ${userId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session?.user) {
    return Response.json(
      { ok: false, message: "กรุณาเข้าสู่ระบบก่อนดูข้อมูล" },
      { status: 401 }
    );
  }

  try {
    const data = await readDeliveryAddress(session.user.id);
    if (!data) {
      return Response.json(
        { ok: false, message: "ไม่พบบัญชีผู้ใช้" },
        { status: 404 }
      );
    }
    return Response.json({ ok: true, data });
  } catch (error) {
    console.error("[profile/delivery-address] load failed:", error);
    return Response.json(
      { ok: false, message: "ไม่สามารถโหลดข้อมูลที่อยู่ได้" },
      { status: 500 }
    );
  }
}

/**
 * Saves delivery details separately from Better Auth's generic update-user
 * endpoint. This keeps the address flow independent of auth-plugin schema
 * caching while still authorizing through the active Better Auth session.
 */
export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json(
      { ok: false, message: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล" },
      { status: 401 }
    );
  }

  let body: DeliveryAddressBody;
  try {
    body = (await request.json()) as DeliveryAddressBody;
  } catch {
    return Response.json(
      { ok: false, message: "รูปแบบข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const data = {
    phone: clean(body.phone, 10),
    firstName: clean(body.firstName, 120),
    lastName: clean(body.lastName, 120),
    addressLine: clean(body.addressLine, 1000),
    subdistrict: clean(body.subdistrict, 120),
    district: clean(body.district, 120),
    province: clean(body.province, 120),
    postalCode: clean(body.postalCode, 10),
  };
  const hasPhoneInput = body.phone !== undefined;
  if (hasPhoneInput && !/^\d{10}$/.test(data.phone)) {
    return Response.json(
      { ok: false, message: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก" },
      { status: 422 }
    );
  }

  // โปรไฟล์เก่ายังสามารถบันทึกช่องนี้ว่างได้ แต่ถ้ากรอกที่อยู่ต้องสมบูรณ์
  // ชื่อ/นามสกุลเก็บแยกจากที่อยู่: ผู้ใช้จึงบันทึกที่อยู่ไว้ก่อนได้
  // (หน้าจองคิวยังคงบังคับให้ระบุชื่อและนามสกุลผู้รับเสมอ)
  const addressValues = {
    addressLine: data.addressLine,
    subdistrict: data.subdistrict,
    district: data.district,
    province: data.province,
    postalCode: data.postalCode,
  };
  const hasAnyAddress = Object.values(addressValues).some(Boolean);
  const completeAddress =
    data.addressLine &&
    data.subdistrict &&
    data.district &&
    data.province &&
    /^\d{5}$/.test(data.postalCode);
  if (hasAnyAddress && !completeAddress) {
    return Response.json(
      { ok: false, message: "กรุณากรอกที่อยู่ให้ครบถ้วน รวมถึงรหัสไปรษณีย์ 5 หลัก" },
      { status: 422 }
    );
  }

  try {
    let saved: DeliveryAddress | null;
    const updateData = hasAnyAddress
      ? {
          ...(hasPhoneInput && { phone: data.phone }),
          firstName: data.firstName,
          lastName: data.lastName,
          addressLine: data.addressLine,
          subdistrict: data.subdistrict,
          district: data.district,
          province: data.province,
          postalCode: data.postalCode,
        }
      : {
          ...(hasPhoneInput && { phone: data.phone }),
          firstName: data.firstName,
          lastName: data.lastName,
        };
    try {
      saved = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: deliveryAddressSelect,
      });
    } catch (prismaError) {
      // During `next dev`, globalThis may still contain the Prisma client instance
      // created before `prisma generate`. A parameterized query safely bypasses
      // that stale model metadata; a normal process restart returns to the path above.
      console.warn(
        "[profile/delivery-address] Prisma model update failed; using SQL fallback",
        prismaError
      );
      let affected: number;
      if (hasAnyAddress && hasPhoneInput) {
        affected = await prisma.$executeRaw`
            UPDATE \`user\`
            SET
              \`phone\` = ${data.phone},
              \`firstName\` = ${data.firstName},
              \`lastName\` = ${data.lastName},
              \`addressLine\` = ${data.addressLine},
              \`subdistrict\` = ${data.subdistrict},
              \`district\` = ${data.district},
              \`province\` = ${data.province},
              \`postalCode\` = ${data.postalCode},
              \`updatedAt\` = NOW()
            WHERE \`id\` = ${session.user.id}
          `;
      } else if (hasAnyAddress) {
        affected = await prisma.$executeRaw`
            UPDATE \`user\`
            SET
              \`firstName\` = ${data.firstName},
              \`lastName\` = ${data.lastName},
              \`addressLine\` = ${data.addressLine},
              \`subdistrict\` = ${data.subdistrict},
              \`district\` = ${data.district},
              \`province\` = ${data.province},
              \`postalCode\` = ${data.postalCode},
              \`updatedAt\` = NOW()
            WHERE \`id\` = ${session.user.id}
          `;
      } else if (hasPhoneInput) {
        affected = await prisma.$executeRaw`
            UPDATE \`user\`
            SET
              \`phone\` = ${data.phone},
              \`firstName\` = ${data.firstName},
              \`lastName\` = ${data.lastName},
              \`updatedAt\` = NOW()
            WHERE \`id\` = ${session.user.id}
          `;
      } else {
        affected = await prisma.$executeRaw`
            UPDATE \`user\`
            SET
              \`firstName\` = ${data.firstName},
              \`lastName\` = ${data.lastName},
              \`updatedAt\` = NOW()
            WHERE \`id\` = ${session.user.id}
          `;
      }
      if (affected !== 1) {
        throw new Error(`Expected one updated user, received ${affected}`);
      }
      saved = await readDeliveryAddress(session.user.id);
    }

    if (!saved) {
      return Response.json(
        { ok: false, message: "ไม่พบบัญชีผู้ใช้" },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, data: saved });
  } catch (error) {
    console.error("[profile/delivery-address] save failed:", error);
    return Response.json(
      { ok: false, message: "ไม่สามารถบันทึกข้อมูลที่อยู่ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
