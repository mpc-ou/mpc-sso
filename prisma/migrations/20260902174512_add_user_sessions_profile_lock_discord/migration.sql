-- AlterTable
ALTER TABLE "users" ADD COLUMN     "discordAvatar" TEXT,
ADD COLUMN     "discordId" TEXT,
ADD COLUMN     "discordLinkedAt" TIMESTAMP(3),
ADD COLUMN     "discordUsername" TEXT,
ADD COLUMN     "isProfileLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionId_key" ON "user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_sessionId_idx" ON "user_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_discordId_key" ON "users"("discordId");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
