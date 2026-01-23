import { runAgent } from "./agent";
import { getMarketStatus } from "./lib/utils";
import { log } from "./lib/core";

const main = async () => {
  const status = await getMarketStatus();

  if (!status.isOpen) {
    log(`⏰ Market is ${status.state}: ${status.reason}`);
    log("Skipping trading session.");
    return;
  }

  log(`✅ Market is open (${status.state})`);
  await runAgent();
};

main();
