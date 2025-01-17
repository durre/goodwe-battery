import { getLocalIpAddress, findGoodWeInverter } from "./network";
import { GoodweClient } from "./modbus";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  try {
    // Step 1: Get local IP
    console.log("Finding local IP address...");
    const localIp = getLocalIpAddress();
    const subnet = localIp.substring(0, localIp.lastIndexOf("."));
    console.log(`Local IP: ${localIp}`);

    // Step 2: Find GoodWe inverter
    console.log("Searching for GoodWe inverter...");
    const inverter = await findGoodWeInverter(subnet);
    console.log(`Found inverter at ${inverter.ip}`);

    // Step 3: Connect and get status
    const modbus = new GoodweClient();
    await modbus.connect(inverter);

    setInterval(() => {
      modbus.getStatus().then((status) => {
        console.log("Current status:", status);
      });
    }, 5000);

    // Step 4: Set battery to discharge
    // console.log("Setting battery to discharge at 2000W...");
    // //await modbus.setBatteryPower(-2000);

    // // Step 5: Wait 5 minutes and set to charge
    // console.log("Waiting 5 minutes...");
    // await sleep(5 * 60 * 1000);
    // console.log("Setting battery to charge at 2000W...");
    // await modbus.setBatteryPower(2000);

    // // Step 6: Wait 5 minutes and shutdown
    // console.log("Waiting final 5 minutes...");
    // await sleep(5 * 60 * 1000);
    // console.log("Shutting down...");
    // await modbus.close();
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
};

main();
