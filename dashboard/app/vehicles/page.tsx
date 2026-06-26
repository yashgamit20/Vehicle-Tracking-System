"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Car, 
  Search, 
  RefreshCw,
  Eye,
  Activity
} from "lucide-react";
import { api } from "../../lib/api";
import { Vehicle } from "../../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import Link from "next/link";
import { cn } from "../../lib/utils";
import { formatDate } from "../../lib/date";


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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.getVehicles(0, 100);
      setVehicles(res);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve vehicle inventory.");
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

  // Extract unique vehicle types
  const vehicleTypes = Array.from(
    new Set(vehicles.map((v) => v.vehicle_type).filter(Boolean))
  );

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = 
      v.vehicle_name.toLowerCase().includes(search.toLowerCase()) ||
      v.device_uid.toLowerCase().includes(search.toLowerCase());
      
    const matchesType = 
      typeFilter === "all" || 
      v.vehicle_type === typeFilter;
      
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8 space-y-8 select-none">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131a2d]/40 border border-[#1e294b]/60 rounded-xl px-4 py-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#0b0f19] border-[#1e294b] text-xs h-9"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-44 bg-[#0b0f19] border border-[#1e294b] rounded-lg px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none transition-all"
          >
            <option value="all">All Vehicle Types</option>
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[#131a2d] hover:bg-[#1e294b] border border-[#1e294b] text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-lg transition-all"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "")} />
          Refresh List
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Vehicles Table Card */}
      <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Vehicle Name</TableHead>
                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Device UID</TableHead>
                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Asset Type</TableHead>
                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Hardware Status</TableHead>
                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Last Connected</TableHead>
                <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((v) => {
                const status = getStatus(v.last_seen);
                return (
                  <TableRow key={v.id} className="border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors">
                    <TableCell className="font-bold text-white text-sm py-4">{v.vehicle_name}</TableCell>
                    <TableCell className="font-mono text-xs text-cyan-400 py-4">{v.device_uid}</TableCell>
                    <TableCell className="text-xs text-slate-300 py-4">{v.vehicle_type || "N/A"}</TableCell>
                    <TableCell className="py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border",
                        status === "online" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : status === "idle" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          status === "online" ? "bg-emerald-400 animate-pulse" : status === "idle" ? "bg-amber-400" : "bg-slate-400"
                        )} />
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 py-4">{formatDate(v.last_seen)}</TableCell>
                    <TableCell className="text-right py-4">
                      <Link
                        href={`/vehicles/${v.id}`}
                        className="bg-[#131a2d] hover:bg-[#1e294b] text-xs text-cyan-400 font-bold border border-[#1e294b] px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Node
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    {loading ? "Loading asset directory..." : "No assets match search filters"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
