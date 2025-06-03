-- CreateTable
CREATE TABLE "KnowledgeFact" (
    "id" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "entities" JSONB NOT NULL,
    "uncertainty" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRelationship" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "sourceFactId" TEXT NOT NULL,
    "targetFactId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "properties" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentScore" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "modificationCount" INTEGER NOT NULL DEFAULT 0,
    "totalUses" INTEGER NOT NULL DEFAULT 0,
    "averageUserSatisfaction" DOUBLE PRECISION,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildHistory" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "prdId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "selectedStack" JSONB NOT NULL,
    "generatedFiles" JSONB NOT NULL,
    "error" TEXT,
    "buildDuration" INTEGER,
    "userFeedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentRelationship" (
    "id" TEXT NOT NULL,
    "component1Id" TEXT NOT NULL,
    "component2Id" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 1,
    "lastObserved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainPattern" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "componentStack" JSONB NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeFact_factId_key" ON "KnowledgeFact"("factId");

-- CreateIndex
CREATE INDEX "KnowledgeFact_factId_idx" ON "KnowledgeFact"("factId");

-- CreateIndex
CREATE INDEX "KnowledgeFact_createdAt_idx" ON "KnowledgeFact"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRelationship_relationshipId_key" ON "KnowledgeRelationship"("relationshipId");

-- CreateIndex
CREATE INDEX "KnowledgeRelationship_relationshipId_idx" ON "KnowledgeRelationship"("relationshipId");

-- CreateIndex
CREATE INDEX "KnowledgeRelationship_sourceFactId_idx" ON "KnowledgeRelationship"("sourceFactId");

-- CreateIndex
CREATE INDEX "KnowledgeRelationship_targetFactId_idx" ON "KnowledgeRelationship"("targetFactId");

-- CreateIndex
CREATE INDEX "KnowledgeRelationship_type_idx" ON "KnowledgeRelationship"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentScore_componentId_key" ON "ComponentScore"("componentId");

-- CreateIndex
CREATE INDEX "ComponentScore_componentId_idx" ON "ComponentScore"("componentId");

-- CreateIndex
CREATE INDEX "ComponentScore_successCount_idx" ON "ComponentScore"("successCount");

-- CreateIndex
CREATE UNIQUE INDEX "BuildHistory_buildId_key" ON "BuildHistory"("buildId");

-- CreateIndex
CREATE INDEX "BuildHistory_buildId_idx" ON "BuildHistory"("buildId");

-- CreateIndex
CREATE INDEX "BuildHistory_prdId_idx" ON "BuildHistory"("prdId");

-- CreateIndex
CREATE INDEX "BuildHistory_success_idx" ON "BuildHistory"("success");

-- CreateIndex
CREATE INDEX "BuildHistory_createdAt_idx" ON "BuildHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ComponentRelationship_component1Id_idx" ON "ComponentRelationship"("component1Id");

-- CreateIndex
CREATE INDEX "ComponentRelationship_component2Id_idx" ON "ComponentRelationship"("component2Id");

-- CreateIndex
CREATE INDEX "ComponentRelationship_relationshipType_idx" ON "ComponentRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentRelationship_component1Id_component2Id_relationshi_key" ON "ComponentRelationship"("component1Id", "component2Id", "relationshipType");

-- CreateIndex
CREATE INDEX "DomainPattern_domain_idx" ON "DomainPattern"("domain");

-- CreateIndex
CREATE INDEX "DomainPattern_successRate_idx" ON "DomainPattern"("successRate");

-- AddForeignKey
ALTER TABLE "KnowledgeRelationship" ADD CONSTRAINT "KnowledgeRelationship_sourceFactId_fkey" FOREIGN KEY ("sourceFactId") REFERENCES "KnowledgeFact"("factId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelationship" ADD CONSTRAINT "KnowledgeRelationship_targetFactId_fkey" FOREIGN KEY ("targetFactId") REFERENCES "KnowledgeFact"("factId") ON DELETE RESTRICT ON UPDATE CASCADE;
