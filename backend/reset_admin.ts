import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD para executar este script.");
  }
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error("ADMIN_PASSWORD deve ter no minimo 10 caracteres, com maiuscula, minuscula e numero.");
  }
  const hashedPassword = await bcrypt.hash(password, 12);

  // Verifica se usuário existe
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Atualiza a senha e garante SUPER_ADMIN
    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Senha do usuário ${email} atualizada com sucesso!`);
  } else {
    // Cria o usuário do zero
    await prisma.user.create({
      data: {
        name: 'Paulo Admin',
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Usuário ${email} criado como SUPER_ADMIN!`);
  }
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
