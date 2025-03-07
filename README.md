# Podcast App

A modern podcast platform built with Next.js, PostgreSQL, and Prisma.

## Features

- User authentication with NextAuth.js
- Podcast uploading, streaming, and management
- Social features: likes, comments, follows
- Notifications system
- Responsive design

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Cloudinary

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd podcast-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy the `.env.example` file to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Set up PostgreSQL:
   - Install PostgreSQL on your machine if you haven't already
   - Create a database named `podcast_app`
   - Update the `DATABASE_URL` in your `.env` file if needed

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### Local Development

For local development, you need to have PostgreSQL installed and running. You can download it from [postgresql.org](https://www.postgresql.org/download/).

Once installed, create a database:

```bash
createdb podcast_app
```

Or use a PostgreSQL client like pgAdmin or Postico.

### Using Docker (Alternative)

If you prefer using Docker, you can run PostgreSQL in a container:

```bash
docker run --name podcast-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=podcast_app -p 5432:5432 -d postgres
```

### Running Migrations

After setting up your database, run the migrations:

```bash
npx prisma migrate dev
```

## API Routes

The application includes the following API endpoints:

- **Authentication**: `/api/auth/*` (handled by NextAuth.js)
- **Podcasts**: 
  - `GET/POST /api/podcasts` - List/create podcasts
  - `GET/PATCH/DELETE /api/podcasts/[id]` - Get/update/delete a podcast
  - `POST/DELETE /api/podcasts/[id]/like` - Like/unlike a podcast
  - `GET/POST /api/podcasts/[id]/comments` - Get/add comments
- **Users**:
  - `GET/PATCH /api/users/[id]` - Get/update user profile
  - `POST/DELETE /api/users/[id]/follow` - Follow/unfollow a user
- **Notifications**:
  - `GET/PATCH/DELETE /api/notifications` - Get/mark as read/delete notifications
- **Upload**:
  - `POST /api/upload` - Upload files to Cloudinary

## Deployment

This application can be deployed to Vercel, and the database can be hosted on services like:

- Vercel Postgres
- Supabase
- Neon
- Railway

## License

[MIT](LICENSE)