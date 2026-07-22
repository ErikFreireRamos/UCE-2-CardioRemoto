-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('F', 'M');

-- CreateEnum
CREATE TYPE "SmokingStatus" AS ENUM ('fumante', 'ex_fumante', 'nao_fumante');

-- CreateEnum
CREATE TYPE "PhysicalActivity" AS ENUM ('nao_praticante', 'raramente', 'regularmente', 'frequentemente');

-- CreateEnum
CREATE TYPE "CardiovascularHistory" AS ENUM ('nao', 'IAM', 'AVC', 'DAP', 'outro');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('verde', 'amarelo', 'vermelho', 'sem_dados');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('success', 'partial', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "socialName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "biologicalSex" "BiologicalSex" NOT NULL,
    "smokingStatus" "SmokingStatus" NOT NULL,
    "physicalActivity" "PhysicalActivity" NOT NULL,
    "usesStatin" BOOLEAN NOT NULL DEFAULT false,
    "cardiovascularHistory" "CardiovascularHistory" NOT NULL DEFAULT 'nao',
    "cardiovascularEventAt" TIMESTAMP(3),
    "lastVisitAt" TIMESTAMP(3),
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'sem_dados',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "waistCircumference" DOUBLE PRECISION,
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "heartRate" INTEGER,
    "capillaryGlycemia" DOUBLE PRECISION,
    "fastingGlucose" DOUBLE PRECISION,
    "hba1c" DOUBLE PRECISION,
    "totalCholesterol" DOUBLE PRECISION,
    "hdl" DOUBLE PRECISION,
    "ldl" DOUBLE PRECISION,
    "triglycerides" DOUBLE PRECISION,
    "creatinine" DOUBLE PRECISION,
    "urea" DOUBLE PRECISION,
    "tsh" DOUBLE PRECISION,
    "tgo" DOUBLE PRECISION,
    "tgp" DOUBLE PRECISION,
    "cpk" DOUBLE PRECISION,
    "albuminCreatinineRatio" DOUBLE PRECISION,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "recordsCount" INTEGER NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_identifier_key" ON "Patient"("identifier");

-- CreateIndex
CREATE INDEX "Patient_riskLevel_idx" ON "Patient"("riskLevel");

-- CreateIndex
CREATE INDEX "Patient_lastVisitAt_idx" ON "Patient"("lastVisitAt");

-- CreateIndex
CREATE INDEX "Visit_patientId_collectedAt_idx" ON "Visit"("patientId", "collectedAt");

-- CreateIndex
CREATE INDEX "Visit_updatedAt_idx" ON "Visit"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Measurement_visitId_key" ON "Measurement"("visitId");

-- CreateIndex
CREATE INDEX "SyncLog_authorId_syncedAt_idx" ON "SyncLog"("authorId", "syncedAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
