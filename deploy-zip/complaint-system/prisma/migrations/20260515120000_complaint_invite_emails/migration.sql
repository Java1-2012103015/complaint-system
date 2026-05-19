-- Pending assignment by email (until user signs up with matching email + org)
ALTER TABLE "complaints" ADD COLUMN "d1InviteEmail" TEXT;
ALTER TABLE "complaints" ADD COLUMN "d1InviteOrganizationId" TEXT;
ALTER TABLE "complaints" ADD COLUMN "d2InviteEmail" TEXT;

CREATE INDEX "complaints_d1InviteEmail_idx" ON "complaints"("d1InviteEmail");
CREATE INDEX "complaints_d2InviteEmail_idx" ON "complaints"("d2InviteEmail");

ALTER TABLE "complaints" ADD CONSTRAINT "complaints_d1InviteOrganizationId_fkey"
  FOREIGN KEY ("d1InviteOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
