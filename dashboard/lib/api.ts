import { Vehicle, Location, RawPacket, SystemStats, Event, EventStats, DeviceConfig, DeviceCommand, CommandLog, VehicleTrackingSnapshot } from "../types";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // System Health and Stats
  getStats: (): Promise<SystemStats> => 
    request<SystemStats>("/system/stats"),

  // Vehicles
  getVehicles: (skip = 0, limit = 100): Promise<Vehicle[]> => 
    request<Vehicle[]>(`/vehicles?skip=${skip}&limit=${limit}`),

  getVehicle: (id: number): Promise<Vehicle> => 
    request<Vehicle>(`/vehicles/${id}`),

  getFleetTracking: (startTime?: string, endTime?: string, limitPerVehicle = 500): Promise<VehicleTrackingSnapshot[]> => {
    let path = `/vehicles/tracking/snapshots?limit_per_vehicle=${limitPerVehicle}`;
    if (startTime) path += `&start_time=${encodeURIComponent(startTime)}`;
    if (endTime) path += `&end_time=${encodeURIComponent(endTime)}`;
    return request<VehicleTrackingSnapshot[]>(path);
  },

  getVehicleTracking: (id: number, startTime?: string, endTime?: string, limitPerVehicle = 1000): Promise<VehicleTrackingSnapshot> => {
    let path = `/vehicles/${id}/tracking?limit_per_vehicle=${limitPerVehicle}`;
    if (startTime) path += `&start_time=${encodeURIComponent(startTime)}`;
    if (endTime) path += `&end_time=${encodeURIComponent(endTime)}`;
    return request<VehicleTrackingSnapshot>(path);
  },

  createVehicle: (vehicle: Omit<Vehicle, "id" | "created_at" | "last_seen">): Promise<Vehicle> => 
    request<Vehicle>("/vehicles", {
      method: "POST",
      body: JSON.stringify(vehicle),
    }),

  updateVehicle: (id: number, vehicle: Partial<Omit<Vehicle, "id" | "created_at" | "last_seen">>): Promise<Vehicle> => 
    request<Vehicle>(`/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify(vehicle),
    }),

  deleteVehicle: (id: number): Promise<Vehicle> => 
    request<Vehicle>(`/vehicles/${id}`, {
      method: "DELETE",
    }),

  // Locations
  logLocation: (location: Omit<Location, "id">): Promise<Location> => 
    request<Location>("/locations", {
      method: "POST",
      body: JSON.stringify(location),
    }),

  getLatestLocation: (vehicleId: number): Promise<Location> => 
    request<Location>(`/locations/latest/${vehicleId}`),

  getLocationHistory: (
    vehicleId: number,
    startTime?: string,
    endTime?: string,
    skip = 0,
    limit = 100
  ): Promise<Location[]> => {
    let path = `/locations/history/${vehicleId}?skip=${skip}&limit=${limit}`;
    if (startTime) path += `&start_time=${encodeURIComponent(startTime)}`;
    if (endTime) path += `&end_time=${encodeURIComponent(endTime)}`;
    return request<Location[]>(path);
  },

  getAllLocations: (skip = 0, limit = 100): Promise<Location[]> =>
    request<Location[]>(`/locations?skip=${skip}&limit=${limit}`),

  // Raw Packets
  getRawPackets: (skip = 0, limit = 100): Promise<RawPacket[]> =>
    request<RawPacket[]>(`/vts/raw-packets?skip=${skip}&limit=${limit}`),

  // Events
  getEventsStats: (): Promise<EventStats> =>
    request<EventStats>("/events/stats"),

  getRecentEvents: (limit = 10): Promise<Event[]> =>
    request<Event[]>(`/events/recent?limit=${limit}`),

  getEvents: (
    vehicleId?: number,
    eventType?: string,
    severity?: string,
    skip = 0,
    limit = 100,
    sort?: string
  ): Promise<Event[]> => {
    let path = `/events?skip=${skip}&limit=${limit}`;
    if (vehicleId) path += `&vehicle_id=${vehicleId}`;
    if (eventType) path += `&event_type=${encodeURIComponent(eventType)}`;
    if (severity) path += `&severity=${severity}`;
    if (sort) path += `&sort=${sort}`;
    return request<Event[]>(path);
  },

  getVehicleEvents: (
    vehicleId: number,
    severity?: string,
    skip = 0,
    limit = 100
  ): Promise<Event[]> => {
    let path = `/events/${vehicleId}?skip=${skip}&limit=${limit}`;
    if (severity) path += `&severity=${severity}`;
    return request<Event[]>(path);
  },

  // Configurations
  getConfigurations: (skip = 0, limit = 100): Promise<DeviceConfig[]> =>
    request<DeviceConfig[]>(`/configurations?skip=${skip}&limit=${limit}`),

  getConfiguration: (vehicleId: number): Promise<DeviceConfig> =>
    request<DeviceConfig>(`/configurations/${vehicleId}`),

  createConfiguration: (config: DeviceConfig): Promise<DeviceConfig> =>
    request<DeviceConfig>("/configurations", {
      method: "POST",
      body: JSON.stringify(config),
    }),

  updateConfiguration: (vehicleId: number, config: Partial<DeviceConfig>): Promise<DeviceConfig> =>
    request<DeviceConfig>(`/configurations/${vehicleId}`, {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  deleteConfiguration: (vehicleId: number): Promise<DeviceConfig> =>
    request<DeviceConfig>(`/configurations/${vehicleId}`, {
      method: "DELETE",
    }),

  // Commands
  getCommands: (vehicleId?: number, status?: string, skip = 0, limit = 100): Promise<DeviceCommand[]> => {
    let path = `/commands?skip=${skip}&limit=${limit}`;
    if (vehicleId) path += `&vehicle_id=${vehicleId}`;
    if (status) path += `&status=${status}`;
    return request<DeviceCommand[]>(path);
  },

  getVehicleCommands: (vehicleId: number, status?: string, skip = 0, limit = 100): Promise<DeviceCommand[]> => {
    let path = `/commands/${vehicleId}?skip=${skip}&limit=${limit}`;
    if (status) path += `&status=${status}`;
    return request<DeviceCommand[]>(path);
  },

  queueCommand: (command: Omit<DeviceCommand, "id" | "status" | "created_at" | "sent_at" | "executed_at">): Promise<DeviceCommand> =>
    request<DeviceCommand>("/commands", {
      method: "POST",
      body: JSON.stringify(command),
    }),

  deleteCommand: (commandId: number): Promise<DeviceCommand> =>
    request<DeviceCommand>(`/commands/${commandId}`, {
      method: "DELETE",
    }),

  getCommandLogs: (commandId: number): Promise<CommandLog[]> =>
    request<CommandLog[]>(`/commands/${commandId}/logs`),
};
