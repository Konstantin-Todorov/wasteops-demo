const { PrismaClient } = require('@prisma/client');

/**
 * Един Prisma клиент за целия процес.
 *
 * Всеки `new PrismaClient()` вдига собствен пул от връзки към PostgreSQL
 * (по подразбиране ядра × 2 + 1). При инстанция във всеки файл това бързо
 * надхвърля `max_connections` на базата и сървърът започва да връща
 * „sorry, too many clients already" — под натоварване, не в тестове.
 *
 * Всички рутове и услуги внасят оттук:
 *     const prisma = require('../lib/prisma');
 */
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__logixPrisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
});

// nodemon презарежда модули, без да убива процеса — пазим клиента глобално,
// за да не се трупат пулове при всяко презареждане в разработка.
if (process.env.NODE_ENV !== 'production') globalForPrisma.__logixPrisma = prisma;

module.exports = prisma;
