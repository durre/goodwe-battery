import ModbusRTU from "modbus-serial";
import type { NetworkDevice } from "./types";
import {
  decodeString,
  parse16BitValue,
  parse32BitValue,
  parseSignedValue,
} from "./parsers";

export class GoodweClient {
  private client: ModbusRTU;

  constructor() {
    this.client = new ModbusRTU();
  }

  async connect(device: NetworkDevice): Promise<void> {
    await this.client.connectTCP(device.ip, { port: device.port });
    await this.client.setID(1);
  }

  async readRegisters(address: number, length: number): Promise<number[]> {
    try {
      const result = await this.client.readHoldingRegisters(address, length);
      return result.data;
    } catch (error) {
      console.error("Failed to read registers", error);
      throw error;
    }
  }

  async readDeviceInfo(): Promise<{
    protocolVersion: number;
    ratedPower: number;
    serialNumber: string;
    deviceType: string;
  }> {
    const registers = await this.readRegisters(35000, 16);

    return {
      protocolVersion: registers[0],
      ratedPower: registers[1],
      serialNumber: decodeString(registers.slice(3, 11)),
      deviceType: decodeString(registers.slice(11, 16)).trim(),
    };
  }

  async readSystemData(): Promise<{
    solarPower: number;
    gridImportPower: number;
    gridExportPower: number;
    chargePower: number;
    dischargePower: number;
    batteryVoltage: number;
    maxChargePower: number;
    maxDischargePower: number;
    ratedPower: number;
    stateOfCharge: number;
    stateOfHealth: number;
    systemTime: Date;
    deviceType: string;
    serialNumber: string;
    batteryMode: number;
  }> {
    const deviceInfo = await this.readRegisters(35000, 20);
    const runningData = await this.readRegisters(35100, 110);
    const batteryData = await this.readRegisters(37000, 23);

    const pvPower1 = parse32BitValue(runningData, 5);
    const pvPower2 = parse32BitValue(runningData, 9);
    const pvPower3 = parse32BitValue(runningData, 13);
    const pvPower4 = parse32BitValue(runningData, 17);

    const totalPvPower = pvPower1 + pvPower2 + pvPower3 + pvPower4;
    const gridPower = parseSignedValue(runningData, 40);
    const ratedPower = parse16BitValue(deviceInfo, 1);
    const batteryVoltage = parse16BitValue(runningData, 80, 10);
    const batteryPower = parseSignedValue(runningData, 83);
    const batteryMode = parse16BitValue(runningData, 84);
    const maxChargeCurrent = parse16BitValue(batteryData, 4);
    const maxDischargeCurrent = parse16BitValue(batteryData, 5);

    return {
      solarPower: totalPvPower,
      gridImportPower: gridPower < 0 ? -gridPower : 0,
      gridExportPower: gridPower > 0 ? gridPower : 0,
      chargePower: batteryPower < 0 ? -batteryPower : 0,
      dischargePower: batteryPower > 0 ? batteryPower : 0,
      maxChargePower: maxChargeCurrent * batteryVoltage,
      maxDischargePower: maxDischargeCurrent * batteryVoltage,
      batteryVoltage,
      ratedPower: ratedPower,
      stateOfCharge: parse16BitValue(batteryData, 7),
      stateOfHealth: parse16BitValue(batteryData, 8),
      systemTime: new Date(
        2000 + (runningData[0] >> 8),
        (runningData[0] & 0xff) - 1,
        runningData[1] >> 8,
        runningData[1] & 0xff,
        runningData[2] >> 8,
        runningData[2] & 0xff
      ),
      deviceType: decodeString(deviceInfo.slice(11, 16)).trim(),
      serialNumber: decodeString(deviceInfo.slice(3, 11)),
      batteryMode,
    };
  }

  async changeBatteryMode(mode: number): Promise<void> {
    await this.client.writeRegister(145, mode);
  }

  async close(): Promise<void> {
    await this.client.close(() => {
      console.debug("Closed connection to Goodwe Inverter");
    });
  }
}
