import { createHash } from "crypto";

export function sha256(payload: object): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function auditEntry(
  entityType: string,
  entityId: number,
  action: string,
  actorId: number | null,
  payload: object,
  metadataObj?: object | null,
) {
  return {
    entityType,
    entityId,
    action,
    actorId,
    payloadHash: sha256(payload),
    metadata: metadataObj ? JSON.stringify(metadataObj) : null,
  };
}
