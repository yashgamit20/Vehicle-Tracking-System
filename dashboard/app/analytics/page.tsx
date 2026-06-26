"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  BarChart as BarIcon, 
  RefreshCw,
  TrendingUp,
  Activity,
  ShieldAlert,
  Send,
  PieChart as PieIcon
} from "lucide-react";
import { api } from "../../lib/api";
import { Vehicle, Location, Event, DeviceCommand } from "../../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { 
  VehicleActivityChart,
  EventDistributionChart,
  EventTrendChart,
  CommandAnalyticsChart
} from "../../components/charts";
import { cn } from "../../lib/utils";

export default function AnalyticsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [vehiclesRes, locationsRes, eventsRes, commandsRes] = await Promise.all([
        api.getVehicles(0, 100).catch(() => []),
        api.getAllLocations(0, 1000).catch(() => []),
        api.getEvents(undefined, undefined, undefined, 0, 1000, "desc").catch(() => []),
        api.getCommands(undefined, undefined, 0, 1000).catch(() => [])
      ]);
      setVehicles(vehiclesRes);
      setLocations(locationsRes);
      setEvents(eventsRes);
      setCommands(commandsRes);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve analytics telemetry data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // A. Event Distribution Data
  const eventDistributionData = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let info = 0;
    
    events.forEach(e => {
      if (e.severity === "Critical") critical++;
      else if (e.severity === "Warning") warning++;
      else info++;
    });

    return [
      { name: "Critical Alerts", value: critical, color: "#ef4444" },
      { name: "Warning Alerts", value: warning, color: "#f59e0b" },
      { name: "Info Alerts", value: info, color: "#06b6d4" }
    ].filter(d => d.value > 0);
  }, [events]);

  // B. Events Trend (by Day)
  const eventTrendData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.slice(0, 200).forEach((e) => {
      const date = new Date(e.created_at).toLocaleDateString([], { month: "short", day: "numeric" });
      counts[date] = (counts[date] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([time, count]) => ({ time, count }))
      .reverse();
  }, [events]);

  // C. Vehicle Activity Ranking (packets/locations per vehicle)
  const vehicleActivityData = useMemo(() => {
    const lookup: Record<number, string> = {};
    vehicles.forEach(v => { lookup[v.id] = v.vehicle_name; });

    const counts: Record<string, number> = {};
    locations.forEach((l) => {
      const name = lookup[l.vehicle_id] || `ID ${l.vehicle_id}`;
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([vehicleName, count]) => ({ vehicleName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 active vehicles
  }, [vehicles, locations]);

  // D. Vehicle Utilization (moving vs stopped time in seconds)
  const utilizationStats = useMemo(() => {
    let totalMovingSeconds = 0;
    let totalStoppedSeconds = 0;

    // Group locations by vehicle ID
    const vehicleLocations: Record<number, Location[]> = {};
    locations.forEach((loc) => {
      if (!vehicleLocations[loc.vehicle_id]) {
        vehicleLocations[loc.vehicle_id] = [];
      }
      vehicleLocations[loc.vehicle_id].push(loc);
    });

    // Calculate time differences for each vehicle
    Object.values(vehicleLocations).forEach((locs) => {
      // Sort chronologically ascending
      const sorted = [...locs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        
        const diffMs = new Date(next.timestamp).getTime() - new Date(curr.timestamp).getTime();
        const diffSec = diffMs / 1000;
        
        // Skip intervals larger than 30 minutes (key-off/offline gaps)
        if (diffSec > 1800) continue;

        if (curr.speed > 0.5) {
          totalMovingSeconds += diffSec;
        } else {
          totalStoppedSeconds += diffSec;
        }
      }
    });

    const totalSeconds = totalMovingSeconds + totalStoppedSeconds;
    const utilizationPct = totalSeconds > 0 ? (totalMovingSeconds / totalSeconds) * 100 : 0;

    const utilizationChartData = [
      { name: "Moving Time", value: Math.round(totalMovingSeconds / 60), color: "#10b981" },
      { name: "Stopped Time", value: Math.round(totalStoppedSeconds / 60), color: "#f59e0b" }
    ].filter(d => d.value > 0);

    return {
      chartData: utilizationChartData,
      pct: utilizationPct,
      movingMin: Math.round(totalMovingSeconds / 60),
      stoppedMin: Math.round(totalStoppedSeconds / 60)
    };
  }, [locations]);

  // E. Command Analytics
  const commandAnalyticsData = useMemo(() => {
    let pending = 0;
    let sent = 0;
    let executed = 0;
    let failed = 0;

    commands.forEach((c) => {
      if (c.status === "PENDING") pending++;
      else if (c.status === "SENT") sent++;
      else if (c.status === "EXECUTED") executed++;
      else if (c.status === "FAILED") failed++;
    });

    return [
      { name: "Pending", count: pending, color: "#64748b" },
      { name: "Sent", count: sent, color: "#3b82f6" },
      { name: "Executed", count: executed, color: "#10b981" },
      { name: "Failed", count: failed, color: "#ef4444" }
    ];
  }, [commands]);

  return (
    <div className="p-8 space-y-8 select-none">
      {/* Action Header bar */}
      <div className="flex items-center justify-between bg-[#131a2d]/40 border border-[#1e294b]/60 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-400">
            Fleet analytics counters are live.
          </span>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[#131a2d] hover:bg-[#1e294b] border border-[#1e294b] text-slate-200 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "")} />
          Refresh Charts
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Telemetry Logs</span>
              <div className="text-2xl font-extrabold text-white">{loading ? "..." : locations.length}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Activity size={18} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">System Alerts</span>
              <div className="text-2xl font-extrabold text-white">{loading ? "..." : events.length}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert size={18} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Queue Commands</span>
              <div className="text-2xl font-extrabold text-white">{loading ? "..." : commands.length}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Send size={18} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Avg Utilization</span>
              <div className="text-2xl font-extrabold text-emerald-400">{loading ? "..." : `${utilizationStats.pct.toFixed(1)}%`}</div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && locations.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">Calculating intelligence metrics...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* A. Event Distribution */}
          <Card className="xl:col-span-1 border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <PieIcon className="h-4.5 w-4.5 text-rose-400" />
                Alerts Severity Distribution
              </CardTitle>
              <CardDescription>Visual split of Critical, Warning, and Info alerts.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex items-center justify-center pt-2">
              {events.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No alerts generated.</div>
              ) : (
                <EventDistributionChart data={eventDistributionData} />
              )}
            </CardContent>
          </Card>

          {/* B. Event Trend */}
          <Card className="xl:col-span-2 border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
                Alerts Chronological Trend
              </CardTitle>
              <CardDescription>Daily fleet alerts generation rate.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-64 pt-2">
              {events.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No events logged.</div>
              ) : (
                <EventTrendChart data={eventTrendData} />
              )}
            </CardContent>
          </Card>

          {/* C. Vehicle Ingestion Ranking */}
          <Card className="xl:col-span-2 border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <BarIcon className="h-4.5 w-4.5 text-cyan-400" />
                Vehicle Ingestion Density Ranking
              </CardTitle>
              <CardDescription>Ingested location telemetry packets count per vehicle.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-64 pt-2">
              {vehicleActivityData.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No active data streams.</div>
              ) : (
                <VehicleActivityChart data={vehicleActivityData} />
              )}
            </CardContent>
          </Card>

          {/* D. Vehicle Utilization */}
          <Card className="xl:col-span-1 border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5 flex flex-col">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <PieIcon className="h-4.5 w-4.5 text-emerald-400" />
                Motion Utilization Rate
              </CardTitle>
              <CardDescription>Aggregation of moving time vs stopped duration.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between pt-2">
              {locations.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No coordinate logs.</div>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <EventDistributionChart data={utilizationStats.chartData} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center text-xs border-t border-[#1e294b]/20 pt-3 mt-4">
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-wider block">Moving Time</span>
                      <strong className="text-emerald-400 text-sm">{utilizationStats.movingMin} mins</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-wider block">Stopped Time</span>
                      <strong className="text-amber-500 text-sm">{utilizationStats.stoppedMin} mins</strong>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* E. Command Analytics */}
          <Card className="xl:col-span-3 border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Send className="h-4.5 w-4.5 text-blue-400" />
                Command Dispatch Success Rate
              </CardTitle>
              <CardDescription>Queued command states ratios.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-64 pt-2">
              {commands.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No commands dispatched.</div>
              ) : (
                <CommandAnalyticsChart data={commandAnalyticsData} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
