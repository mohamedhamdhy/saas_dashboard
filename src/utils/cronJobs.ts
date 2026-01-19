import cron from "node-cron";
import { Op } from "sequelize";
import { Blacklist } from "../../models/blacklist";

export const initCronJobs = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("---------------------");
    console.log("Running Blacklist Cleanup Job...");

    try {
      const deletedCount = await Blacklist.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date(),
          },
        },
      });

      console.log(`Successfully purged ${deletedCount} expired tokens.`);
    } catch (error) {
      console.error("Cleanup Job failed:", error);
    }
    console.log("---------------------");
  });
};