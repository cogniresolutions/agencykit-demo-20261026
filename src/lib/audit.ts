import "server-only";
import { auditLog } from "@/db/schema";
import type { Tx } from "@/lib/db";

export async function audit(
  tx: Tx,
  entry: {
    agencyId: string;
    subAccountId?: string | null;
    actor: string;
    actorUserId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    ip?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.insert(auditLog).values({
    agencyId: entry.agencyId,
    subAccountId: entry.subAccountId ?? null,
    actor: entry.actor.slice(0, 200),
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    ip: entry.ip ?? null,
    metadata: entry.metadata ?? {},
  });
}
