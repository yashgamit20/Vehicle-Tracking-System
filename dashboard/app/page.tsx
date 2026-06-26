"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Car,
  Database,
  Terminal,
  Radio,
  Clock,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  Bell,
  ArrowUpRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { api } from "../lib/api";
import { Vehicle, SystemStats, Location, Event, EventStats } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { EventDistributionChart } from "../components/charts";
import Link from "next/link";
import { cn } from "../lib/utils";

// Status helper
function getStatus(lastSeen: string | null): "online" | "idle" | "offline" {
  if (!lastSeen) return "offline";
  const lastSeenStr = lastSeen.endsWith("Z") ? lastSeen : `${lastSeen}Z`;
  const lastSeenDate = new Date(lastSeenStr);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;

  if (diffMinutes < 5) return "online";
  if (diffMinutes <= 30) return "idle";
  return "offline";
}

export default function OverviewPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [eventsStats, setEventsStats] = useState<EventStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, vehiclesRes, evStatsRes, recentEvRes] = await Promise.all([
        api.getStats().catch(() => null),
        api.getVehicles(0, 100).catch(() => []),
        api.getEventsStats().catch(() => null),
        api.getRecentEvents(10).catch(() => []),
      ]);
      
      setStats(statsRes);
      setVehicles(vehiclesRes);
      setEventsStats(evStatsRes);
      setRecentEvents(recentEvRes);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve dashboard telemetry data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and 10s auto-refresh
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true); // Silent reload in background
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleManualRefresh = () => {
    loadData(true);
  };

  // Compute status metrics
  const activeOnlineCount = stats ? stats.vehicles_online : 0;
  const activeIdleCount = stats ? stats.vehicles_idle : 0;
  const activeOfflineCount = stats ? stats.vehicles_offline : 0;
  const totalVehiclesCount = stats ? stats.total_vehicles : vehicles.length;

  const eventDistributionData = useMemo(() => {
    if (!eventsStats) return [];
    return [
      { name: "Critical Alerts", value: eventsStats.critical, color: "#ef4444" },
      { name: "Warning Alerts", value: eventsStats.warning, color: "#f59e0b" },
      { name: "Info Alerts", value: eventsStats.info, color: "#06b6d4" }
    ].filter(d => d.value > 0);
  }, [eventsStats]);

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Refresh Bar */}
      <div className="flex items-center justify-between bg-[#131a2d]/40 border border-[#1e294b]/60 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-400">
            Telemetry Feed Connected (refreshing every 10s)
          </span>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[#131a2d] hover:bg-[#1e294b] border border-[#1e294b] text-slate-200 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "")} />
          Refresh Feed
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Vehicles Card */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl relative overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Total Assets</span>
              <div className="text-2xl font-extrabold text-white">{loading ? "..." : totalVehiclesCount}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Car className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Moving Vehicles Card */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl relative overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Active / Moving</span>
              <div className="text-2xl font-extrabold text-emerald-400">{loading ? "..." : activeOnlineCount}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-5 w-5 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Stopped Vehicles Card */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl relative overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Idle / Stopped</span>
              <div className="text-2xl font-extrabold text-amber-400">{loading ? "..." : activeIdleCount}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Offline Vehicles Card */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl relative overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Inactive / Offline</span>
              <div className="text-2xl font-extrabold text-slate-400">{loading ? "..." : activeOfflineCount}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400">
              <Radio className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Severity Badges */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Alerts Priority Counter</CardTitle>
            <CardDescription>Critical threshold violations log counts.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Critical</span>
                <span className="text-xl font-extrabold text-rose-500 mt-1 block">{eventsStats ? eventsStats.critical : 0}</span>
              </div>
              <ShieldAlert className="h-6 w-6 text-rose-500 animate-bounce" />
            </div>
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Warning</span>
                <span className="text-xl font-extrabold text-amber-500 mt-1 block">{eventsStats ? eventsStats.warning : 0}</span>
              </div>
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="border border-cyan-500/20 bg-cyan-500/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Information</span>
                <span className="text-xl font-extrabold text-cyan-500 mt-1 block">{eventsStats ? eventsStats.info : 0}</span>
              </div>
              <Bell className="h-6 w-6 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        {/* Event Distribution Chart */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Event Distribution</CardTitle>
            <CardDescription>Alert severity proportions.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-center">
            {eventDistributionData.length > 0 ? (
              <EventDistributionChart data={eventDistributionData} />
            ) : (
              <div className="text-slate-400 text-xs py-12">No event records found</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Vehicles Registry Summary */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white text-base">Fleet Operations Summary</CardTitle>
              <CardDescription>Current registered tracking nodes.</CardDescription>
            </div>
            <Link href="/vehicles" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
              View Inventory <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vehicle Name</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Device UID</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.slice(0, 5).map((v) => {
                  const status = getStatus(v.last_seen);
                  return (
                    <TableRow key={v.id} className="border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors">
                      <TableCell className="font-semibold text-slate-100">{v.vehicle_name}</TableCell>
                      <TableCell className="font-mono text-xs text-cyan-400">{v.device_uid}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border",
                          status === "online" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : status === "idle" 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        )}>
                          {status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/vehicles/${v.id}`}
                          className="bg-[#131a2d] hover:bg-[#1e294b] text-xs text-cyan-400 font-semibold border border-[#1e294b] px-2.5 py-1 rounded-lg transition-all"
                        >
                          Analyze
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                      No vehicles registered
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Decoded Alerts */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white text-base">Recent Events Log</CardTitle>
              <CardDescription>Decoded telemetry violations.</CardDescription>
            </div>
            <Link href="/events" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
              View Events <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Time</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vehicle</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider">Event Type</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase tracking-wider text-right">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.slice(0, 5).map((ev) => (
                  <TableRow key={ev.id} className="border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors">
                    <TableCell className="text-xs font-mono text-slate-400">
                      {new Date(ev.created_at.endsWith("Z") ? ev.created_at : `${ev.created_at}Z`).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-200">
                      {ev.vehicle_name || `Vehicle #${ev.vehicle_id}`}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-cyan-400">{ev.event_type}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border",
                        ev.severity === "Critical" 
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                          : ev.severity === "Warning" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      )}>
                        {ev.severity}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {recentEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                      No telemetry anomalies logged
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
