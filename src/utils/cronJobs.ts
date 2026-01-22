// MODULE: Background System Maintenance
// Automates the cleanup of ephemeral data to maintain database performance and integrity.

// HEADER: Imports & Setup
import cron from "node-cron";
import { Op } from "sequelize";
import { Blacklist } from "../../models/blacklist";
import { Session } from "../../models/session";

/**
 * HEADER: Cron Initialization
 * API: Configures and starts scheduled tasks.
 * NOTE: Currently set to "0 0 * * *" (Midnight every day).
 */
export const initCronJobs = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("---------------------");
    console.log("🚀 STARTING: Daily System Maintenance...");

    // SECTION: Blacklist Cleanup
    // SECURITY: Removes tokens that are already past their expiry date.
    // NOTE: Since these tokens couldn't be used anyway, storing them is a waste of space.
    try {
      const deletedTokens = await Blacklist.destroy({
        where: {
          expiresAt: { [Op.lt]: new Date() },
        },
      });
      if (deletedTokens > 0) console.log(`🧹 BLACKLIST: Purged ${deletedTokens} expired tokens.`);
    } catch (error) {
      console.error("❌ BLACKLIST CLEANUP FAILED:", error);
    }

    // SECTION: Session Forensics Purge
    // SECURITY: Permanently deletes (Hard Delete) sessions that were soft-deleted 30+ days ago.
    // NOTE: We keep soft-deleted records for 30 days for security audits before final removal.
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const deletedSessions = await Session.destroy({
        where: {
          deletedAt: {
            [Op.lt]: thirtyDaysAgo,
          },
        } as any, // FIX: The 'as any' is required because deletedAt is an internal Sequelize field.
        force: true, // DB: Performs a HARD DELETE (removes row from disk).
      });

      if (deletedSessions > 0) console.log(`🗑️ SESSIONS: Hard-deleted ${deletedSessions} legacy records.`);
    } catch (error) {
      console.error("❌ SESSION PURGE FAILED:", error);
    }

    console.log("✅ Maintenance Complete.");
    console.log("---------------------");
  });
};