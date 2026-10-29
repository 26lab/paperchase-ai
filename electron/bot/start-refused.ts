/** A start the rules forbid (real account, kill switch, no key) – retrying would not help. */
export class StartRefused extends Error {
  override name = "StartRefused";
}
