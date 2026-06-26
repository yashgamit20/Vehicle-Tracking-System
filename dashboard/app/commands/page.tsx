"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Send, 
  RefreshCw,
  Clock,
  Trash2,
  SlidersHorizontal,
  ChevronRight,
  Info
} from "lucide-react";
import { api } from "../../lib/api";
import { DeviceCommand, Vehicle, CommandLog } from "../../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { formatDate } from "../../lib/date";


export default function CommandsPage() {
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queue form state
  const [targetVehicle, setTargetVehicle] = useState("");
  const [commandName, setCommandName] = useState("STOPV");
  const [commandValue, setCommandValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Selected command for audit logs modal/details
  const [selectedCommandId, setSelectedCommandId] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState<CommandLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [commandsRes, vehiclesRes] = await Promise.all([
        api.getCommands(undefined, undefined, 0, 100).catch(() => []),
        api.getVehicles(0, 100).catch(() => [])
      ]);
      setCommands(commandsRes);
      setVehicles(vehiclesRes);
      
      // Auto select first vehicle in form if empty
      if (vehiclesRes.length > 0 && !targetVehicle) {
        setTargetVehicle(vehiclesRes[0].id.toString());
      }
      
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve command queue parameters.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetVehicle]);

  // Load audit logs when a command is selected
  const fetchAuditLogs = async (cmdId: number) => {
    setSelectedCommandId(cmdId);
    setLoadingLogs(true);
    try {
      const logs = await api.getCommandLogs(cmdId);
      setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to load command audit logs:", err);
      setAuditLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Submit queue command
  const handleQueueCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVehicle) return;
    
    setSubmitting(true);
    setError(null);
    try {
      await api.queueCommand({
        vehicle_id: parseInt(targetVehicle),
        command_name: commandName,
        command_value: commandValue.trim() || null
      });
      setCommandValue("");
      // Reload queue
      await loadData(true);
    } catch (err: any) {
      setError(err.message || "Failed to enqueue device command.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete command
  const handleDeleteCommand = async (cmdId: number) => {
    if (!confirm("Are you sure you want to remove this queued command?")) return;
    try {
      await api.deleteCommand(cmdId);
      await loadData(true);
      if (selectedCommandId === cmdId) {
        setSelectedCommandId(null);
        setAuditLogs([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove command from queue.");
    }
  };

  const selectedCommand = useMemo(() => {
    return commands.find(c => c.id === selectedCommandId);
  }, [selectedCommandId, commands]);

  return (
    <div className="p-8 space-y-8 select-none">
      {/* Top Action Header */}
      <div className="flex items-center justify-between bg-[#131a2d]/40 border border-[#1e294b]/60 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#a855f7] animate-pulse" />
          <span className="text-xs font-semibold text-slate-400">
            Hardware Command Dispatch Queue
          </span>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[#131a2d] hover:bg-[#1e294b] border border-[#1e294b] text-slate-200 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "")} />
          Refresh Queue
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Main Grid: Form Left, Tables Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form panel */}
        <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5 self-start">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Send className="h-4.5 w-4.5 text-purple-400" />
              Dispatch New Command
            </CardTitle>
            <CardDescription>Select target device and parameters.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleQueueCommand} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Vehicle
                </label>
                <select
                  value={targetVehicle}
                  onChange={(e) => setTargetVehicle(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e294b] rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none transition-all"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id.toString()}>
                      {v.vehicle_name} ({v.device_uid})
                    </option>
                  ))}
                  {vehicles.length === 0 && <option value="">No vehicles registered</option>}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Command Code
                </label>
                <select
                  value={commandName}
                  onChange={(e) => setCommandName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e294b] rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none transition-all"
                >
                  <option value="STOPV">STOPV (Stop Engine / Immobilize)</option>
                  <option value="RESUME">RESUME (Re-enable Engine)</option>
                  <option value="SET_INT">SET_INT (Set Telemetry Interval)</option>
                  <option value="PING">PING (Ping Status Log)</option>
                  <option value="REBOOT">REBOOT (Reboot Hardware Board)</option>
                  <option value="CONFIG">CONFIG (APN/Server Configurations)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Parameters Value (Optional)
                </label>
                <Input
                  placeholder="e.g. 30 or APN_name..."
                  value={commandValue}
                  onChange={(e) => setCommandValue(e.target.value)}
                  className="bg-[#0b0f19] border-[#1e294b] text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || vehicles.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Enqueuing..." : "Enqueue Command"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Command Queue Table and Audit Logs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1e294b]/40 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Vehicle</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Command</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Lifecycle Status</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Dispatched Time</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.slice(0, 15).map((cmd) => (
                    <TableRow 
                      key={cmd.id} 
                      onClick={() => fetchAuditLogs(cmd.id)}
                      className={cn(
                        "border-[#1e294b]/20 hover:bg-[#131a2d]/20 transition-colors cursor-pointer",
                        selectedCommandId === cmd.id && "bg-[#132238]/60 hover:bg-[#132238]/80 border-cyan-500/20"
                      )}
                    >
                      <TableCell className="font-bold text-white text-xs py-3.5">
                        {cmd.vehicle_name || `Vehicle #${cmd.vehicle_id}`}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-cyan-400 py-3.5">
                        {cmd.command_name}{cmd.command_value ? `=${cmd.command_value}` : ""}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border",
                          cmd.status === "EXECUTED" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : cmd.status === "SENT" 
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                              : cmd.status === "FAILED" 
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        )}>
                          {cmd.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 py-3.5">
                        {formatDate(cmd.created_at)}
                      </TableCell>
                      <TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteCommand(cmd.id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove Command"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {commands.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                        {loading ? "Loading command buffer..." : "Command queue buffer empty"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Audit log for selected command */}
          {selectedCommandId && (
            <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl p-5 text-left animate-fade-in">
              <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between border-b border-[#1e294b]/30">
                <div>
                  <CardTitle className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-4 w-4 text-cyan-400" />
                    Audit Log Timeline &bull; Command #{selectedCommandId}
                  </CardTitle>
                  {selectedCommand && (
                    <CardDescription className="text-slate-400 text-xs mt-1">
                      {selectedCommand.command_name} payload enqueued for {selectedCommand.vehicle_name}
                    </CardDescription>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedCommandId(null)}
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  Clear Selection
                </button>
              </CardHeader>
              <CardContent className="p-0 pt-4 space-y-3">
                {loadingLogs ? (
                  <div className="text-center py-4 text-slate-400 text-xs">Loading transaction logs...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-slate-400 text-xs py-4 text-center">No transaction logs captured yet for this command.</div>
                ) : (
                  <div className="space-y-3 relative pl-4 border-l border-[#1e294b]">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="relative">
                        <span className="absolute -left-[20px] top-1 h-2 w-2 rounded-full bg-cyan-400 border border-[#0b0f19]" />
                        <div className="text-xs font-bold text-slate-200">
                          Status Transition to <span className="text-cyan-300 font-semibold">{log.status}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{log.message || "Queue initialized state."}</p>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">Timestamp: {formatDate(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
