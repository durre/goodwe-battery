export interface InverterStatus {
  batteryPower: number;
  batterySoC: number;
  pvPower: number;
  gridPower: number;
  loadPower: number;
}

export interface NetworkDevice {
  ip: string;
  port: number;
}
