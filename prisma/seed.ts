import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed limpo — nenhum dado demonstrativo inserido.");
  console.log("   O banco está vazio e pronto para uso real.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
