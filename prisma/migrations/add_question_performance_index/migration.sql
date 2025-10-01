-- CreateIndex
-- Add performance index for question bank queries
CREATE INDEX IF NOT EXISTS "questions_questionBankId_status_createdAt_idx" ON "questions"("questionBankId", "status", "createdAt");
