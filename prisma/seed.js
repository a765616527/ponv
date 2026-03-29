/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password,
      name: "系统管理员",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "assessor1" },
    update: {},
    create: {
      username: "assessor1",
      password,
      name: "评估员张三",
      role: "ASSESSOR",
    },
  });

  await prisma.user.upsert({
    where: { username: "doctor1" },
    update: {},
    create: {
      username: "doctor1",
      password,
      name: "麻醉医生李四",
      role: "ANESTHETIST",
    },
  });

  console.log("Seed data created successfully");
  console.log("Default accounts (password: 123456):");
  console.log("  admin / 系统管理员 / ADMIN");
  console.log("  assessor1 / 评估员张三 / ASSESSOR");
  console.log("  doctor1 / 麻醉医生李四 / ANESTHETIST");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
