import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  const streamer = await prisma.user.create({
    data: {
      name: 'Alice',
      displayName: 'AliceStreamer',
      email: 'alice@example.com',
      password: hashedPassword,
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'STREAMER',
      payoutEmail: 'alice-payout@example.com',
      about: 'Professional gamer and content creator.',
    },
  });

  await prisma.stream.create({
    data: {
        title: "Alice's Debut Stream!",
        streamerId: streamer.id,
        ingestUrl: "rtmp://ingest.streamfi.io/live",
        streamKey: "sk_alice_123456789"
    }
  })

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
