"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Database, 
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Car,
  MapPin,
  Terminal
} from "lucide-react";
import { api } from "../../lib/api";
import { Vehicle, Location, RawPacket } from "../../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { formatDate } from "../../lib/date";

type ActiveTab = "vehicles" | "locations" | "packets";

export default function ExplorerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("vehicles");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [packets, setPackets] = useState<RawPacket[]>([]);

  // Search states
  const [search, setSearch] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const limit = 15; // 15 records per page in database explorer view

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const skip = (page - 1) * limit;
      
      if (activeTab === "vehicles") {
        const res = await api.getVehicles(skip, limit);
        setVehicles(res);
      } else if (activeTab === "locations") {
        const res = await api.getAllLocations(skip, limit);
        setLocations(res);
      } else if (activeTab === "packets") {
        const res = await api.getRawPackets(skip, limit);
        setPackets(res);
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve explorer records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, limit]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Reset pagination on tab change
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearch("");
    setPage(1);
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  // Filter lists locally
  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vehicle_name.toLowerCase().includes(search.toLowerCase()) ||
      v.device_uid.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_type.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLocations = locations.filter(
    (l) =>
      l.vehicle_id.toString().includes(search) ||
      l.latitude.toString().includes(search) ||
      l.longitude.toString().includes(search) ||
      l.speed.toString().includes(search)
  );

  const filteredPackets = packets.filter(
    (p) =>
      p.device_uid?.toLowerCase().includes(search.toLowerCase()) ||
      p.message_id?.toString().includes(search) ||
      p.id.toString().includes(search)
  );

  return (
    <div className="p-8 space-y-8 select-none">
      {/* Action Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131a2d]/40 border border-[#1e294b]/60 rounded-xl px-4 py-3">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-[#0b0f19] p-1 rounded-lg border border-[#1e294b] shrink-0">
            <button
              onClick={() => handleTabChange("vehicles")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === "vehicles" 
                  ? "bg-cyan-500 text-white shadow" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Car size={13} />
              vehicles
            </button>

            <button
              onClick={() => handleTabChange("locations")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === "locations" 
                  ? "bg-cyan-500 text-white shadow" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <MapPin size={13} />
              locations
            </button>

            <button
              onClick={() => handleTabChange("packets")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === "packets" 
                  ? "bg-cyan-500 text-white shadow" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Terminal size={13} />
              packets
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#0b0f19] border-[#1e294b] text-xs h-9"
            />
          </div>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[#131a2d] hover:bg-[#1e294b] border border-[#1e294b] text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-lg transition-all shrink-0"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "")} />
          Refresh Explorer
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Explorer Content Table Card */}
      <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e294b]/40 pb-4">
          <div className="text-left">
            <CardTitle className="text-white text-sm capitalize">{activeTab} Registry</CardTitle>
            <CardDescription className="text-xs text-slate-400">Direct low-level database table columns viewer.</CardDescription>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page === 1}
              className="border-[#1e294b]/60 hover:bg-[#1e294b] text-xs"
            >
              <ChevronLeft size={15} /> Prev
            </Button>
            <span className="text-xs text-white font-bold font-mono bg-[#0b0f19]/30 px-3 py-1.5 rounded-lg border border-[#1e294b]/60">
              Page {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={
                (activeTab === "vehicles" && filteredVehicles.length < limit) ||
                (activeTab === "locations" && filteredLocations.length < limit) ||
                (activeTab === "packets" && filteredPackets.length < limit)
              }
              className="border-[#1e294b]/60 hover:bg-[#1e294b] text-xs"
            >
              Next <ChevronRight size={15} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading && (
            <div className="text-center py-12 text-slate-400 text-xs">Querying PostgreSQL rows...</div>
          )}

          {!loading && (
            <>
              {activeTab === "vehicles" && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">ID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Device UID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Vehicle Name</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Type</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Created At</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.map((v) => (
                      <TableRow key={v.id} className="border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors">
                        <TableCell className="font-mono text-[10px] text-slate-500 py-3">{v.id}</TableCell>
                        <TableCell className="font-mono text-xs text-cyan-400 font-bold py-3">{v.device_uid}</TableCell>
                        <TableCell className="font-bold text-white text-xs py-3">{v.vehicle_name}</TableCell>
                        <TableCell className="text-xs text-slate-300 py-3">{v.vehicle_type}</TableCell>
                        <TableCell className="text-[11px] text-slate-400 py-3">{formatDate(v.created_at)}</TableCell>
                        <TableCell className="text-[11px] text-slate-400 py-3">
                          {formatDate(v.last_seen)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeTab === "locations" && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">ID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Vehicle ID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Latitude</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Longitude</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Speed</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Altitude</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map((l) => (
                      <TableRow key={l.id} className="border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors">
                        <TableCell className="font-mono text-[10px] text-slate-500 py-3">{l.id}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-300 py-3">{l.vehicle_id}</TableCell>
                        <TableCell className="font-mono text-xs text-cyan-400 py-3">{l.latitude.toFixed(6)}</TableCell>
                        <TableCell className="font-mono text-xs text-cyan-400 py-3">{l.longitude.toFixed(6)}</TableCell>
                        <TableCell className="font-bold text-white text-xs py-3">{l.speed.toFixed(1)} km/h</TableCell>
                        <TableCell className="text-xs text-slate-300 py-3">{l.altitude.toFixed(1)} m</TableCell>
                        <TableCell className="text-[11px] text-slate-400 py-3">{formatDate(l.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeTab === "packets" && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">ID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Device UID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Message ID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackets.map((p) => (
                      <TableRow key={p.id} className="border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors">
                        <TableCell className="font-mono text-[10px] text-slate-500 py-3">{p.id}</TableCell>
                        <TableCell className="font-mono text-xs text-cyan-400 font-bold py-3">{p.device_uid || "N/A"}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-300 py-3">{p.message_id !== null ? p.message_id : "N/A"}</TableCell>
                        <TableCell className="text-[11px] text-slate-400 py-3">{formatDate(p.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
