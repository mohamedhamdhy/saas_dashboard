require("ts-node/register"); 
const { exec } = require("child_process");

exec(
  "npx sequelize-cli db:migrate --config src/config/config.ts",
  (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(stdout);
    console.error(stderr);
  },
);
