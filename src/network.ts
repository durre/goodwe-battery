import { networkInterfaces } from "os";
import ModbusRTU from "modbus-serial";
import net from "net";
import type { NetworkDevice } from "./types";

export const getLocalIpAddress = (): string => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  throw new Error("No local IP address found");
};

const checkPort = (
  ip: string,
  port: number,
  timeout = 1000
): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, ip);

    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);
  });
};

export const findGoodWeInverter = async (
  subnet: string
): Promise<NetworkDevice> => {
  const scanPromises = [];
  for (let i = 1; i < 255; i++) {
    const ip = `${subnet}.${i}`;
    scanPromises.push(checkPort(ip, 502));
  }

  // Check all IPs in parallel for faster scanning
  const portResults = await Promise.all(scanPromises);
  const availableIps = portResults
    .map((isOpen, index) => (isOpen ? `${subnet}.${index + 1}` : null))
    .filter((ip): ip is string => ip !== null);

  // Scan subnet for devices
  for (const ip of availableIps) {
    console.info(`Checking ${ip}...`);

    const client = new ModbusRTU();
    try {
      await client.connectTCP(ip, { port: 502 });
      await client.setID(1);
      // Try to read a register to verify it's a GoodWe inverter
      await client.readHoldingRegisters(0x891c, 1);
      return { ip, port: 502 };
    } catch (error) {
      await client.close(() => {});
      continue;
    }
  }
  throw new Error("No GoodWe inverter found on network");
};
