// Script de diagnóstico — executar com: npx tsx prisma/diagnose.ts
import { prisma } from "../src/config/prisma";
import { USER_SELECT } from "../src/constants/selects";
import bcrypt from "bcrypt";
import { env } from "../src/config/env";

async function diagnose() {
  console.log("=== DIAGNÓSTICO DE LOGIN/REGISTER ===\n");

  // 1. Testa conexão com banco
  try {
    await prisma.$connect();
    console.log("✅ Banco conectado");
  } catch (e: any) {
    console.error("❌ Falha na conexão com banco:", e.message);
    process.exit(1);
  }

  // 2. Testa USER_SELECT (verifica se os campos existem no schema)
  try {
    const test = await prisma.user.findFirst({ select: USER_SELECT });
    console.log("✅ USER_SELECT válido. Campos OK:", Object.keys(USER_SELECT).join(", "));
    if (test) console.log("   Exemplo de user retornado:", JSON.stringify(test, null, 2));
    else console.log("   (nenhum usuário no banco ainda)");
  } catch (e: any) {
    console.error("❌ Erro com USER_SELECT:", e.message);
  }

  // 3. Testa bcrypt com env.BCRYPT_SALT_ROUNDS
  try {
    const hash = await bcrypt.hash("TesteSenha@123", env.BCRYPT_SALT_ROUNDS);
    console.log(`✅ bcrypt OK com BCRYPT_SALT_ROUNDS=${env.BCRYPT_SALT_ROUNDS}`);
  } catch (e: any) {
    console.error("❌ Erro no bcrypt:", e.message);
  }

  // 4. Testa criação de usuário (register simulado)
  try {
    const exists = await prisma.user.findUnique({ where: { email: "diag@test.com" } });
    if (!exists) {
      const hash = await bcrypt.hash("Diag@123", env.BCRYPT_SALT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          name: "Diagnóstico",
          email: "diag@test.com",
          password: hash,
          role: "ALUNO",
        },
        select: USER_SELECT,
      });
      console.log("✅ Criação de usuário OK:", JSON.stringify(user, null, 2));
      // Limpa
      await prisma.user.delete({ where: { email: "diag@test.com" } });
      console.log("✅ Usuário de teste removido");
    } else {
      console.log("ℹ️  Usuário diag@test.com já existe — pulando criação");
    }
  } catch (e: any) {
    console.error("❌ Erro ao criar usuário:", e.message);
    if (e.message.includes("column")) {
      console.error("   → Provavelmente um campo no USER_SELECT não existe no banco.");
      console.error("   → Execute: npx prisma migrate dev");
    }
  }

  await prisma.$disconnect();
  console.log("\n=== FIM DO DIAGNÓSTICO ===");
}

diagnose().catch(console.error);
