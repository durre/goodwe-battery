import { getLocalIpAddress, findGoodWeInverter } from "./network";
import { GoodweClient } from "./modbus";
import * as fs from "fs";
import * as path from "path";
import type { NetworkDevice } from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  try {
    const ipCachePath = path.join(__dirname, "inverter-ip.txt");
    let inverter: NetworkDevice | null = null;

    // Try to read cached IP first
    if (fs.existsSync(ipCachePath)) {
      const cachedIp = fs.readFileSync(ipCachePath, "utf8").trim();
      console.log(`Found cached inverter IP: ${cachedIp}`);
      inverter = { ip: cachedIp, port: 502 };
    }

    // If no cached IP or connection fails, search for inverter
    if (!inverter) {
      console.log("Finding local IP address...");
      const localIp = getLocalIpAddress();
      const subnet = localIp.substring(0, localIp.lastIndexOf("."));
      console.log(`Local IP: ${localIp}`);

      console.log("Searching for GoodWe inverter...");
      inverter = await findGoodWeInverter(subnet);

      // Cache the found IP
      fs.writeFileSync(ipCachePath, inverter.ip);
      console.log(`Cached inverter IP to ${ipCachePath}`);
    }

    console.log(`Using inverter at ${inverter.ip}`);

    // Step 3: Connect and get status
    const modbus = new GoodweClient();

    await modbus.connect(inverter);

    let batteryMode = 0;

    // Read system data every 5 seconds
    setInterval(async () => {
      try {
        const status = await modbus.readSystemData();
        console.log("Current status:", status);
      } catch (error) {
        console.error("Error reading system data:", error);
      }
    }, 1000); // 5 seconds interval

    // Change battery mode every 30 seconds
    setInterval(async () => {
      try {
        await modbus.changeBatteryMode(batteryMode);
        console.log(`Changed battery mode to: ${batteryMode}`);

        // Toggle battery mode between 0 and 3
        batteryMode = batteryMode === 0 ? 3 : 0;
      } catch (error) {
        console.error("Error changing battery mode:", error);
      }
    }, 30000); // 30 seconds interval
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
};

main();
