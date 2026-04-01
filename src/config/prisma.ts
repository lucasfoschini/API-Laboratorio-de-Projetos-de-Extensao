import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    // Reconecta automaticamente se a conexão cair
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Garante que a conexão é fechada corretamente ao encerrar o processo
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});