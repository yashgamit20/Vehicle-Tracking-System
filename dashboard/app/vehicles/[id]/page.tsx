"use client";

import React, { use, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { 
  ArrowLeft, 
  Car, 
  Clock, 
  Command, 
  FileText, 
  Gauge, 
  RefreshCw, 
  Route, 
  Search, 
  Settings, 
  Zap, 
  LineChart as LineChartIcon,
  Play, 
  Pause, 
  RotateCcw,
  Sliders
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "../../../lib/utils";
import { api } from "../../../lib/api";
import { FleetTrackingMap } from "../../../components/fleet-tracking-map";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { DeviceCommand, Event, VehicleTrackingSnapshot } from "../../../types";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area 
} from "recharts";

interface PageProps {
  params: Promise<{ id: string }>;
}

type TabKey = "overview" | "events" | "commands" | "configurations" | "route" | "charts";

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: Car },
  { key: "events", label: "Events", icon: FileText },
  { key: "commands", label: "Commands", icon: Command },
  { key: "configurations", label: "Configurations", icon: Settings },
  { key: "route", label: "Route Playback", icon: Route },
  { key: "charts", label: "Telemetry Charts", icon: LineChartIcon },
];

import { formatDate } from "../../../lib/date";

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {

  const r = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * r * Math.asin(Math.sqrt(h));
}

function voltage(snapshot: VehicleTrackingSnapshot | null, source: "battery" | "main") {
  const data = snapshot?.latest_location?.extra_data;
  if (!data) return "N/A";
  if (source === "main") return typeof data.pwr?.mvolt === "number" ? `${data.pwr.mvolt} V` : "N/A";
  const analog = data.io?.analog?.[0];
  if (typeof analog === "number") return `${(analog / 1000).toFixed(2)} V`;
  return typeof data.pwr?.volt === "number" ? `${(data.pwr.volt / 1000).toFixed(2)} V` : "N/A";
}

function gpsStatus(snapshot: VehicleTrackingSnapshot | null) {
  const gps = snapshot?.latest_location?.extra_data?.gps_details ?? snapshot?.latest_location?.extra_data?.gps;
  if (gps?.fix === "A") return `Valid${gps.sat ? ` (${gps.sat} sats)` : ""}`;
  if (gps?.fix === "V") return "No fix";
  return "N/A";
}

export default function VehicleDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const vehicleId = Number(resolvedParams.id);
  const searchParams = useSearchParams();

  const [snapshot, setSnapshot] = useState<VehicleTrackingSnapshot | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [eventSearch, setEventSearch] = useState("");
  const [eventPage, setEventPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60_000);
      const [tracking, eventRows, commandRows] = await Promise.all([
        api.getVehicleTracking(vehicleId, start.toISOString(), end.toISOString(), 2000),
        api.getVehicleEvents(vehicleId, undefined, 0, 250),
        api.getVehicleCommands(vehicleId, undefined, 0, 250),
      ]);
      setSnapshot(tracking);
      setEvents(eventRows);
      setCommands(commandRows);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load vehicle details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Read URL query params to trigger route view / playback auto
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "route") {
      setActiveTab("route");
    }
    const playbackParam = searchParams.get("playback");
    if (playbackParam === "true") {
      setPlaybackActive(true);
    }
  }, [searchParams]);

  // Handle playback ticker
  useEffect(() => {
    let timer: any = null;
    if (playbackActive && snapshot && snapshot.route_history.length > 0) {
      timer = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= snapshot.route_history.length - 1) {
            setPlaybackActive(false);
            return prev;
          }
          return prev + 1;
        });
      }, 350);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [playbackActive, snapshot]);

  // Playback snapshot mapper
  const activeSnapshot = useMemo(() => {
    if (!snapshot) return null;
    if (!playbackActive && playbackIndex === 0) return snapshot;

    const history = snapshot.route_history;
    const currentPoint = history[playbackIndex] || snapshot.latest_location;

    return {
      ...snapshot,
      latest_location: currentPoint,
      route_history: history.slice(0, playbackIndex + 1)
    };
  }, [snapshot, playbackActive, playbackIndex]);

  const routeStats = useMemo(() => {
    const route = snapshot?.route_history || [];
    const distance = route.slice(1).reduce((sum, point, index) => sum + haversineKm(route[index], point), 0);
    const avgSpeed = route.length ? route.reduce((sum, point) => sum + point.speed, 0) / route.length : 0;
    const maxSpeed = route.length ? Math.max(...route.map((point) => point.speed)) : 0;
    return { distance, avgSpeed, maxSpeed };
  }, [snapshot]);

  // Recharts specific data
  const chartsData = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.route_history.map((pt) => {
      const volt = pt.extra_data?.pwr?.volt;
      return {
        time: new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        speed: pt.speed,
        voltage: typeof volt === "number" ? volt / 1000 : null
      };
    });
  }, [snapshot]);

  const filteredEvents = events.filter((event) => {
    const term = eventSearch.toLowerCase();
    return event.event_type.toLowerCase().includes(term) || event.description.toLowerCase().includes(term) || event.severity.toLowerCase().includes(term);
  });
  const pagedEvents = filteredEvents.slice(eventPage * 10, eventPage * 10 + 10);

  const commandGroups = {
    PENDING: commands.filter((command) => command.status === "PENDING"),
    SENT: commands.filter((command) => command.status === "SENT"),
    EXECUTED: commands.filter((command) => command.status === "EXECUTED"),
    FAILED: commands.filter((command) => command.status === "FAILED"),
  };

  return (
    <div className="space-y-6 p-6 lg:p-8 select-none">
      {/* View Title */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#1e294b]/60 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/vehicles" className="rounded-lg border border-[#1e294b]/60 bg-[#131a2d]/40 p-2 text-slate-400 hover:bg-[#1e294b] hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-white">{snapshot?.vehicle.vehicle_name || "Vehicle Profile"}</h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wide mt-0.5">Asset ID: {vehicleId} &bull; Device UID: {snapshot?.vehicle.device_uid}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => loadData(true)} disabled={refreshing} className="flex items-center gap-2 border border-[#1e294b]/60 bg-[#131a2d]">
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "")} />
          Refresh Profile
        </Button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300 font-semibold">{error}</div>}

      {loading && !snapshot ? (
        <div className="py-16 text-center text-sm text-slate-400">Loading profile data...</div>
      ) : !snapshot ? (
        <div className="py-16 text-center text-sm text-slate-400">Asset profile not found.</div>
      ) : (
        <>
          {/* Tabs bar */}
          <div className="flex flex-wrap gap-2 border-b border-[#1e294b]/20 pb-4">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  if (key !== "route") setPlaybackActive(false);
                }}
                className={cn(
                  "inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  activeTab === key 
                    ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" 
                    : "border-[#1e294b]/60 bg-[#131a2d]/40 text-slate-400 hover:text-white"
                )}
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Asset Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-left">
                  <Detail label="Vehicle Name" value={snapshot.vehicle.vehicle_name} />
                  <Detail label="Device UID" value={snapshot.vehicle.device_uid} mono />
                  <Detail label="Vehicle Type" value={snapshot.vehicle.vehicle_type} />
                  <Detail label="Health State" value={snapshot.health_status} />
                  <Detail label="Last Telemetry Ingestion" value={formatDate(snapshot.vehicle.last_seen)} />
                </CardContent>
              </Card>

              <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Latest Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-left">
                  <Detail label="Latitude" value={snapshot.latest_location?.latitude.toFixed(6) || "N/A"} mono />
                  <Detail label="Longitude" value={snapshot.latest_location?.longitude.toFixed(6) || "N/A"} mono />
                  <Detail label="Current Speed" value={snapshot.latest_location ? `${snapshot.latest_location.speed.toFixed(1)} km/h` : "N/A"} />
                  <Detail label="GPS fix" value={gpsStatus(snapshot)} />
                  <Detail label="Packet Time" value={formatDate(snapshot.latest_location?.timestamp)} />
                </CardContent>
              </Card>

              <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Diagnostic Register</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-left">
                  <Detail label="Internal Battery" value={voltage(snapshot, "battery")} />
                  <Detail label="Main Vehicle voltage" value={voltage(snapshot, "main")} />
                  <Detail label="Firmware Version" value={snapshot.device_config?.firmware_version || snapshot.latest_location?.extra_data?.dbg?.ver?.[0] || "N/A"} />
                  <Detail label="Hardware Revision" value={snapshot.device_config?.hardware_version || snapshot.latest_location?.extra_data?.dbg?.ver?.[1] || "N/A"} />
                  <Detail label="Recent Active Event" value={snapshot.latest_event?.event_type || "No events"} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Events tab */}
          {activeTab === "events" && (
            <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
              <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-white text-sm">Event Log</CardTitle>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input value={eventSearch} onChange={(event) => { setEventSearch(event.target.value); setEventPage(0); }} placeholder="Search events..." className="pl-9 bg-[#0b0f19] border-[#1e294b]" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Time</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Event Type</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Severity</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedEvents.map((event) => (
                      <TableRow key={event.id} className="border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors">
                        <TableCell className="text-xs text-slate-400">{formatDate(event.created_at)}</TableCell>
                        <TableCell className="font-semibold text-cyan-300 text-xs">{event.event_type}</TableCell>
                        <TableCell><SeverityBadge severity={event.severity} /></TableCell>
                        <TableCell className="text-xs text-slate-300">{event.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {pagedEvents.length === 0 && <div className="py-8 text-center text-xs text-slate-400">No events logged</div>}
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={eventPage === 0} onClick={() => setEventPage((page) => Math.max(0, page - 1))}>Previous</Button>
                  <Button type="button" size="sm" variant="outline" disabled={(eventPage + 1) * 10 >= filteredEvents.length} onClick={() => setEventPage((page) => page + 1)}>Next</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Commands tab */}
          {activeTab === "commands" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Object.entries(commandGroups).map(([status, rows]) => (
                  <div key={status} className="rounded-xl border border-[#1e294b]/60 bg-[#131a2d]/40 p-4 text-left">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500">{status}</div>
                    <div className="mt-1 text-xl font-extrabold text-white">{rows.length}</div>
                  </div>
                ))}
              </div>
              <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Command History Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {commands.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No commands dispatched</div>
                  ) : commands.map((command) => (
                    <div key={command.id} className="rounded-xl border border-[#1e294b]/60 bg-[#0f172a]/30 p-4 text-left">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-white text-sm">{command.command_name}{command.command_value ? `=${command.command_value}` : ""}</div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">Queued: {formatDate(command.created_at)}</div>
                        </div>
                        <CommandBadge status={command.status} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                        <TimelineStep label="Pending" active />
                        <TimelineStep label="Sent" active={Boolean(command.sent_at)} timestamp={command.sent_at} />
                        <TimelineStep label={command.status === "FAILED" ? "Failed" : "Executed"} active={Boolean(command.executed_at)} timestamp={command.executed_at} failed={command.status === "FAILED"} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Configurations tab */}
          {activeTab === "configurations" && (
            <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white text-sm">Device Settings Profiles</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <Config label="APN Link" value={snapshot.device_config?.apn} />
                <Config label="Server IP Address" value={snapshot.device_config?.server_ip} />
                <Config label="Server Port" value={snapshot.device_config?.server_port} />
                <Config label="Reporting Limit (Seconds)" value={snapshot.device_config?.reporting_interval ? `${snapshot.device_config.reporting_interval}s` : null} />
                <Config label="Overspeed Limit" value={snapshot.device_config?.speed_limit ? `${snapshot.device_config.speed_limit} km/h` : null} />
                <Config label="Active Timezone" value={snapshot.device_config?.timezone} />
              </CardContent>
            </Card>
          )}

          {/* Route History Playback */}
          {activeTab === "route" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Metric label="Distance Logged" value={`${routeStats.distance.toFixed(2)} km`} icon={<Route className="h-4 w-4 text-cyan-400" />} />
                <Metric label="Average Speed" value={`${routeStats.avgSpeed.toFixed(1)} km/h`} icon={<Gauge className="h-4 w-4 text-cyan-400" />} />
                <Metric label="Max Speed Captured" value={`${routeStats.maxSpeed.toFixed(1)} km/h`} icon={<Zap className="h-4 w-4 text-cyan-400" />} />
              </div>
              
              <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl overflow-hidden p-5">
                <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-sm">Playback Map Controller</CardTitle>
                  </div>
                  {/* Playback Actions */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPlaybackActive(!playbackActive)}
                      className="bg-[#1b253b] hover:bg-[#253350] border border-[#1e294b]/60 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
                    >
                      {playbackActive ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                      {playbackActive ? "Pause" : "Play"}
                    </button>
                    <button 
                      onClick={() => { setPlaybackActive(false); setPlaybackIndex(0); }}
                      className="bg-[#1b253b] hover:bg-[#253350] border border-[#1e294b]/60 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                      Reset
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  {/* Scrub Slider */}
                  {snapshot.route_history.length > 0 && (
                    <div className="flex items-center gap-3 bg-[#0b0f19]/30 border border-[#1e294b]/20 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider w-16 text-left shrink-0">Progress</span>
                      <input
                        type="range"
                        min="0"
                        max={snapshot.route_history.length - 1}
                        value={playbackIndex}
                        onChange={(e) => { setPlaybackActive(false); setPlaybackIndex(parseInt(e.target.value)); }}
                        className="flex-1 accent-cyan-400 cursor-pointer h-1.5 rounded-lg bg-[#1e294b]"
                      />
                      <span className="text-[10px] text-cyan-400 font-bold font-mono w-16 text-right shrink-0">
                        {playbackIndex + 1} / {snapshot.route_history.length}
                      </span>
                    </div>
                  )}

                  {activeSnapshot && (
                    <FleetTrackingMap 
                      snapshots={[activeSnapshot]} 
                      selectedVehicleId={snapshot.vehicle.id} 
                      visibleVehicleIds={[snapshot.vehicle.id]} 
                      heightClass="h-[480px]" 
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Telemetry Charts tab */}
          {activeTab === "charts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Historical Speed Chart */}
              <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-white text-sm">Speed Profile (Last 24 Hours)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-64 w-full">
                  {chartsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e294b/30" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} unit=" km/h" />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e294b", color: "#fff" }} />
                        <Line type="monotone" dataKey="speed" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No coordinates logged
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Battery Voltage Trends */}
              <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-white text-sm">Internal Battery Load Trends</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-64 w-full">
                  {chartsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="voltageGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e294b/30" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} unit=" V" domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e294b", color: "#fff" }} />
                        <Area type="monotone" dataKey="voltage" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#voltageGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No voltage data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#1e294b]/30 pb-2 text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={`max-w-[200px] truncate text-right ${mono ? "font-mono text-[10px] text-cyan-300" : "font-bold text-slate-200"}`}>{value}</span>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e294b]/60 bg-[#131a2d]/40 p-4 text-left">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">{icon}{label}</div>
      <div className="mt-1.5 text-xl font-extrabold text-white">{value}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Event["severity"] }) {
  const cls = severity === "Critical" ? "border-rose-500/20 bg-rose-500/10 text-rose-400" : severity === "Warning" ? "border-amber-500/20 bg-amber-500/10 text-amber-400" : "border-cyan-500/20 bg-cyan-500/10 text-cyan-400";
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase border ${cls}`}>{severity}</span>;
}

function CommandBadge({ status }: { status: DeviceCommand["status"] }) {
  const cls = status === "FAILED" ? "border-rose-500/20 bg-rose-500/10 text-rose-400" : status === "EXECUTED" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : status === "SENT" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400";
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase border ${cls}`}>{status}</span>;
}

function TimelineStep({ label, active, timestamp, failed = false }: { label: string; active: boolean; timestamp?: string | null; failed?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 text-left ${active ? failed ? "border-rose-500/30 bg-rose-500/5" : "border-cyan-500/30 bg-cyan-500/5" : "border-[#1e294b]/60 bg-[#0b0f19]/25"}`}>
      <div className="flex items-center gap-1.5">
        <Clock className={`h-3 w-3 ${active ? failed ? "text-rose-400" : "text-cyan-400" : "text-slate-600"}`} />
        <span className="font-bold text-white text-[10px]">{label}</span>
      </div>
      <div className="mt-0.5 text-[9px] text-slate-500">{timestamp ? formatDate(timestamp) : active ? "Active" : "Pending"}</div>
    </div>
  );
}

function Config({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-[#1e294b]/60 bg-[#131a2d]/40 p-4 text-left">
      <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500">{label}</div>
      <div className="mt-1.5 text-xs font-bold text-white truncate" title={String(value ?? "")}>{value ?? "N/A"}</div>
    </div>
  );
}
