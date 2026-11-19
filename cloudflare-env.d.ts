declare namespace Cloudflare {
  interface Env {
    DOKTER_BAN_INITIAL_ACCOUNTS?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
