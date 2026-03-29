/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  if (adminCount > 0) {
    console.log("Admin user already exists, skipping initialization.");
    return;
  }

  const username = (process.env.INIT_ADMIN_USERNAME || "").trim();
  const password = process.env.INIT_ADMIN_PASSWORD || "";
  const name = (process.env.INIT_ADMIN_NAME || "系统管理员").trim() || "系统管理员";

  if (!username || !password) {
    console.error("No ADMIN found. Please provide INIT_ADMIN_USERNAME and INIT_ADMIN_PASSWORD.");
    process.exitCode = 2;
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      name,
      role: "ADMIN",
    },
  });

  console.log(`Admin user initialized: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
