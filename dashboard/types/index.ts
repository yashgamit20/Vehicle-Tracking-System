export interface Vehicle {
  id: number;
  device_uid: string;
  vehicle_name: string;
  vehicle_type: string;
  created_at: string;
  last_seen: string | null;
}

export interface Location {
  id: number;
  vehicle_id: number;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  timestamp: string;
  extra_data?: Record<string, any> | null;
}

export interface RawPacket {
  id: number;
  device_uid: string | null;
  message_id: number | null;
  packet_data: Record<string, any>;
  created_at: string;
}

export interface SystemStats {
  total_vehicles: number;
  total_locations: number;
  total_raw_packets: number;
  vehicles_online: number;
  vehicles_idle: number;
  vehicles_offline: number;
  latest_timestamp: string | null;
}

export type VehicleStatus = "online" | "idle" | "offline";

export interface Event {
  id: number;
  vehicle_id: number;
  txn: string;
  event_type: string;
  description: string;
  severity: "Critical" | "Warning" | "Info";
  msgid: number | null;
  created_at: string;
  vehicle_name?: string;
  device_uid?: string;
}

export interface EventStats {
  critical: number;
  warning: number;
  info: number;
  today: number;
  total: number;
}

export interface DeviceConfig {
  id?: number;
  vehicle_id: number;
  server_ip: string | null;
  server_port: number | null;
  apn: string | null;
  timezone: string | null;
  reporting_interval: number | null;
  speed_limit: number | null;
  feature_flags: Record<string, any> | null;
  firmware_version: string | null;
  hardware_version: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceCommand {
  id: number;
  vehicle_id: number;
  command_name: string;
  command_value: string | null;
  status: "PENDING" | "SENT" | "EXECUTED" | "FAILED";
  created_at: string;
  sent_at: string | null;
  executed_at: string | null;
  vehicle_name?: string;
}

export interface CommandLog {
  id: number;
  command_id: number;
  vehicle_id: number;
  status: "PENDING" | "SENT" | "EXECUTED" | "FAILED";
  message: string | null;
  created_at: string;
}

export interface VehicleTrackingSnapshot {
  vehicle: Vehicle;
  latest_location: Location | null;
  route_history: Location[];
  latest_event: Event | null;
  latest_command: DeviceCommand | null;
  device_config: DeviceConfig | null;
  health_status: "Healthy" | "Warning" | "Offline";
  movement_status: "Moving" | "Stopped" | "Offline";
  packet_count: number;
}
