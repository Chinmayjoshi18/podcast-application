const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john@example.com',
      image: 'https://placehold.co/100/55f/fff?text=JD',
      hashedPassword,
      createdAt: new Date(),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      image: 'https://placehold.co/100/f55/fff?text=JS',
      hashedPassword,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    },
  });

  console.log('Users created:', user1.id, user2.id);

  // Create podcasts
  const podcast1 = await prisma.podcast.create({
    data: {
      title: 'The Creative Mind',
      description: 'Exploring creativity and innovation in various fields.',
      audioUrl: 'https://example.com/audio/creative-mind.mp3',
      coverImage: 'https://placehold.co/500/1f33e1/ffffff?text=1',
      duration: 1800, // 30 minutes
      userId: user1.id,
      createdAt: new Date(),
    },
  });

  const podcast2 = await prisma.podcast.create({
    data: {
      title: 'Tech Today',
      description: 'Daily updates on technology news and trends.',
      audioUrl: 'https://example.com/audio/tech-today.mp3',
      coverImage: 'https://placehold.co/500/2f33e1/ffffff?text=2',
      duration: 1200, // 20 minutes
      userId: user2.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  });

  console.log('Podcasts created:', podcast1.id, podcast2.id);

  // Create tags
  const tags = await Promise.all(
    ['Technology', 'Science', 'Business', 'Health', 'Arts', 'Education']
      .map(name => prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, createdAt: new Date() },
      }))
  );

  // Connect podcasts to tags
  await prisma.podcast.update({
    where: { id: podcast1.id },
    data: {
      tags: {
        connect: [
          { id: tags[4].id }, // Arts
          { id: tags[5].id }, // Education
        ]
      }
    }
  });

  await prisma.podcast.update({
    where: { id: podcast2.id },
    data: {
      tags: {
        connect: [
          { id: tags[0].id }, // Technology
          { id: tags[1].id }, // Science
        ]
      }
    }
  });

  // Create follows
  await prisma.follow.create({
    data: {
      followerId: user2.id,
      followingId: user1.id,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    }
  });

  // Create likes
  await prisma.like.create({
    data: {
      userId: user2.id,
      podcastId: podcast1.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    }
  });

  // Create comments
  await prisma.comment.create({
    data: {
      text: 'This was such an insightful episode!',
      userId: user2.id,
      podcastId: podcast1.id,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    }
  });

  // Create notifications
  await prisma.notification.create({
    data: {
      type: 'like',
      content: 'liked your podcast "The Creative Mind"',
      userId: user1.id,
      senderId: user2.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    }
  });

  await prisma.notification.create({
    data: {
      type: 'comment',
      content: 'commented on your podcast "The Creative Mind"',
      userId: user1.id,
      senderId: user2.id,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    }
  });

  await prisma.notification.create({
    data: {
      type: 'follow',
      content: 'started following you',
      userId: user1.id,
      senderId: user2.id,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    }
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 