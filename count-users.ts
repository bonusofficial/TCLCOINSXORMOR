import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./lib/prisma";

async function main() {
  try {
    const count = await prisma.user.count();
    console.log("\n=========================================");
    console.log(`จำนวนแถวในตาราง user (Row Count): ${count}`);
    console.log("=========================================\n");
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:", error);
  } finally {
    process.exit(0);
  }
}

main();
