-- CreateTable
CREATE TABLE "ProductHighLevelDescription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductHighLevelDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningJournalEntry" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAction" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "selfReflectionOnCurrentDetails" TEXT NOT NULL,
    "globalSelfReflectionOnEntireJournalSoFar" TEXT NOT NULL,

    CONSTRAINT "LearningJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedAdjustment" (
    "id" TEXT NOT NULL,
    "reasoningForAdjustment" TEXT NOT NULL,
    "adjustmentDescription" TEXT NOT NULL,
    "learningJournalEntryId" TEXT NOT NULL,

    CONSTRAINT "PlannedAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAssistanceLevel" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "AIAssistanceLevel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlannedAdjustment" ADD CONSTRAINT "PlannedAdjustment_learningJournalEntryId_fkey" FOREIGN KEY ("learningJournalEntryId") REFERENCES "LearningJournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
