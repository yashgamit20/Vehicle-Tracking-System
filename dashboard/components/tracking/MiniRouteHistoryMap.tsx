"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Card } from "../ui/card";
import { VehicleTrackingSnapshot } from "../../types";
import { getVehicleColor } from "../../utils/tracking";

interface MiniRouteHistoryMapProps {
  selectedSnapshot?: VehicleTrackingSnapshot;
  selectedVehicleId: number | "all";
  snapshots: VehicleTrackingSnapshot[];
}

export function MiniRouteHistoryMap({ selectedSnapshot, selectedVehicleId, snapshots }: MiniRouteHistoryMapProps) {
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);
  const miniMapMarkerRef = useRef<any>(null);
  const miniMapPathRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !miniMapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!miniMapInstanceRef.current) {
      miniMapInstanceRef.current = L.map(miniMapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
        boxZoom: false,
        touchZoom: false,
      }).setView([22.3072, 73.1812], 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(miniMapInstanceRef.current);

      miniMapMarkerRef.current = L.circleMarker([22.3072, 73.1812], {
        radius: 6,
        fillColor: "#ef4444",
        color: "#ffffff",
        weight: 1.5,
        fillOpacity: 1,
      }).addTo(miniMapInstanceRef.current);

      miniMapPathRef.current = L.polyline([], {
        color: "#ef4444",
        weight: 2,
        opacity: 0.8,
      }).addTo(miniMapInstanceRef.current);
    }

    if (selectedSnapshot?.latest_location) {
      const lat = selectedSnapshot.latest_location.latitude;
      const lon = selectedSnapshot.latest_location.longitude;
      const index = snapshots.findIndex((snapshot) => snapshot.vehicle.id === selectedSnapshot.vehicle.id);
      const color = getVehicleColor(index >= 0 ? index : 0);

      miniMapInstanceRef.current.setView([lat, lon], 14);
      miniMapMarkerRef.current.setLatLng([lat, lon]);
      miniMapMarkerRef.current.setStyle({ fillColor: color });

      const points = selectedSnapshot.route_history.map((point) => [point.latitude, point.longitude]);
      miniMapPathRef.current.setLatLngs(points);
      miniMapPathRef.current.setStyle({ color });

      if (points.length > 1) {
        miniMapInstanceRef.current.fitBounds(points, { padding: [10, 10] });
      }
    }
  }, [selectedSnapshot, snapshots]);

  if (selectedVehicleId === "all" || !selectedSnapshot) return null;

  return (
    <Card className="border-[#1e294b]/60 bg-[#131a2d]/40 rounded-xl overflow-hidden p-4 space-y-3">
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block text-left">Last 10 Locations</span>
      <div
        ref={miniMapContainerRef}
        className="w-full h-32 rounded-lg border border-[#1e294b]/60 overflow-hidden bg-[#07111f] z-10"
      />
      <Link
        href={`/vehicles/${selectedSnapshot.vehicle.id}?tab=route`}
        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider block text-center pt-1"
      >
        View Full Route History &rarr;
      </Link>
    </Card>
  );
}
