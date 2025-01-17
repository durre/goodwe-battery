import ModbusRTU from "modbus-serial";
import type { NetworkDevice, InverterStatus } from "./types";

const convertToSigned16 = (value: number): number => {
  return value > 32767 ? value - 65536 : value;
};

export class GoodweClient {
  private client: ModbusRTU;

  constructor() {
    this.client = new ModbusRTU();
  }

  async connect(device: NetworkDevice): Promise<void> {
    await this.client.connectTCP(device.ip, { port: device.port });
    await this.client.setID(1);
  }

  async getStatus(): Promise<InverterStatus> {
    const test = await this.client.readHoldingRegisters(35209, 4);

    console.log("----", test.data);

    const batteryData = await this.client.readHoldingRegisters(35180, 4);
    const batteryPower = convertToSigned16(batteryData.data[0]); // Battery power in W (positive=charge, negative=discharge)
    const batterySoC = batteryData.data[2]; // Battery State of Charge in %

    const powerData = await this.client.readHoldingRegisters(35121, 5);
    const pvPower = powerData.data[0]; // Total PV Power in W
    const gridPower = convertToSigned16(powerData.data[2]); // Grid power in W (positive=import, negative=export)
    const loadPower = powerData.data[4]; // House load power in W

    return {
      batteryPower,
      batterySoC,
      pvPower,
      gridPower,
      loadPower,
    };
  }

  async setBatteryPower(power: number): Promise<void> {
    // Convert power to appropriate register value
    const registerValue = Math.floor(power * 10);
    await this.client.writeRegister(0x891c, registerValue);
  }

  async close(): Promise<void> {
    await this.client.close(() => {
      console.debug("Closed connection to Goodwe Inverter");
    });
  }
}
