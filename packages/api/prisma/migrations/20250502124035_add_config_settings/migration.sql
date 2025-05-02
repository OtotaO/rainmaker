-- CreateTable
CREATE TABLE "ConfigSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "lastModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ConfigSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigSetting_key_key" ON "ConfigSetting"("key");

-- CreateIndex
CREATE INDEX "ConfigSetting_key_idx" ON "ConfigSetting"("key");

-- CreateIndex
CREATE INDEX "ConfigSetting_category_idx" ON "ConfigSetting"("category");
