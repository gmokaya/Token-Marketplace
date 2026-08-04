/**
 * Publication constraint readiness flag.
 *
 * Set to true by the startup code after ensurePublicationConstraint() succeeds.
 * The listing-publications publish route checks this before attempting an
 * ON CONFLICT DO UPDATE, which requires the unique index to be present.
 */

let _ready = false;

export function setPublicationConstraintReady(): void {
  _ready = true;
}

export function isPublicationConstraintReady(): boolean {
  return _ready;
}
