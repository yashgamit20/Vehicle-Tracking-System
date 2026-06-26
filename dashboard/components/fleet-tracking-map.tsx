"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TRACKING_MAP_STYLES } from "../constants/trackingMapStyles";
import { VehicleTrackingSnapshot } from "../types";
import { MapControls } from "./tracking/MapControls";
import {
  asUtcDate,
  escapeHtml,
  getHeading,
  getVehicleColor,
  locationPosition,
  logMapDebug,
  metricValue,
  voltage,
} from "../utils/trackingMap";

export { getVehicleColor } from "../utils/trackingMap";

type MapLayer = "street" | "satellite";

interface FleetTrackingMapProps {
  snapshots: VehicleTrackingSnapshot[];
  selectedVehicleId: number | "all";
  visibleVehicleIds: number[];
  onSelectVehicle?: (id: number | "all") => void;
  heightClass?: string;
  isMiniMap?: boolean;
}

export function FleetTrackingMap({
  snapshots,
  selectedVehicleId,
  visibleVehicleIds,
  onSelectVehicle,
  heightClass = "h-[560px]",
  isMiniMap = false
}: FleetTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const streetLayer = useRef<any>(null);
  const satelliteLayer = useRef<any>(null);
  const markerLayer = useRef<any>(null);
  const routeLayer = useRef<any>(null);
  const arrowLayer = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [clusterLoaded, setClusterLoaded] = useState(false);
  const [layer, setLayer] = useState<MapLayer>("street");
  const [fullscreen, setFullscreen] = useState(false);

  const colorMap = useMemo(() => {
    const pairs = snapshots.map((snapshot, index) => [snapshot.vehicle.id, getVehicleColor(index)] as const);
    return new Map(pairs);
  }, [snapshots]);

  const visibleSnapshots = useMemo(() => {
    const allowed = new Set(visibleVehicleIds);
    return snapshots.filter((snapshot) => {
      if (!locationPosition(snapshot.latest_location)) return false;
      if (allowed.size > 0 && !allowed.has(snapshot.vehicle.id)) return false;
      return selectedVehicleId === "all" || snapshot.vehicle.id === selectedVehicleId;
    });
  }, [selectedVehicleId, snapshots, visibleVehicleIds]);

  useEffect(() => {
    const coordinateChecks = snapshots.map((snapshot) => ({
      id: snapshot.vehicle.id,
      name: snapshot.vehicle.vehicle_name,
      latestLatitude: snapshot.latest_location?.latitude ?? null,
      latestLongitude: snapshot.latest_location?.longitude ?? null,
      markerPosition: locationPosition(snapshot.latest_location),
    }));

    logMapDebug("props and visible snapshot derivation", {
      snapshots: snapshots.length,
      selectedVehicleId,
      visibleVehicleIds,
      visibleSnapshots: visibleSnapshots.map((snapshot) => snapshot.vehicle.id),
      coordinateChecks,
    });
  }, [selectedVehicleId, snapshots, visibleSnapshots, visibleVehicleIds]);

  // Load Leaflet Script & CSS
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeaflet = () => {
      if ((window as any).L) {
        setLeafletLoaded(true);
        return;
      }

      if (!document.getElementById("leaflet-css")) {
        const css = document.createElement("link");
        css.id = "leaflet-css";
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
      }

      if (!document.getElementById("leaflet-cluster-css")) {
        const css = document.createElement("link");
        css.id = "leaflet-cluster-css";
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
        document.head.appendChild(css);
      }

      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => setLeafletLoaded(true);
        script.onerror = (event) => console.error("Failed to load Leaflet script", event);
        document.head.appendChild(script);
      }
    };

    loadLeaflet();
  }, []);

  // Load Marker Cluster
  useEffect(() => {
    if (!leafletLoaded || typeof window === "undefined") return;
    if ((window as any).L?.MarkerClusterGroup) {
      setClusterLoaded(true);
      return;
    }

    if (!document.getElementById("leaflet-cluster-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-cluster-js";
      script.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      script.onload = () => setClusterLoaded(true);
      script.onerror = (event) => {
        console.error("Failed to load Leaflet marker cluster script", event);
        setClusterLoaded(false);
      };
      document.head.appendChild(script);
    }
  }, [leafletLoaded]);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || map.current) return;
    const L = (window as any).L;

    map.current = L.map(mapRef.current, { 
      zoomControl: false,
      attributionControl: !isMiniMap,
      scrollWheelZoom: !isMiniMap,
      dragging: !isMiniMap,
      doubleClickZoom: !isMiniMap,
      boxZoom: !isMiniMap,
      touchZoom: !isMiniMap
    }).setView([22.3072, 73.1812], 7);

    if (!isMiniMap) {
      L.control.zoom({ position: "bottomright" }).addTo(map.current);
    }

    streetLayer.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 19,
    }).addTo(map.current);

    satelliteLayer.current = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19,
    });

    routeLayer.current = L.layerGroup().addTo(map.current);
    arrowLayer.current = L.layerGroup().addTo(map.current);
    markerLayer.current = L.layerGroup().addTo(map.current);
  }, [leafletLoaded, isMiniMap]);

  // Map Tile Toggle
  useEffect(() => {
    if (!map.current || !streetLayer.current || !satelliteLayer.current) return;
    if (layer === "street") {
      satelliteLayer.current.remove();
      streetLayer.current.addTo(map.current);
    } else {
      streetLayer.current.remove();
      satelliteLayer.current.addTo(map.current);
    }
  }, [layer]);

  // Render Markers and Routes
  useEffect(() => {
    if (!map.current || !routeLayer.current || !arrowLayer.current || !markerLayer.current || !leafletLoaded) return;
    const L = (window as any).L;

    markerLayer.current.remove();
    routeLayer.current.clearLayers();
    arrowLayer.current.clearLayers();

    // Enable clustering only on main maps in fleet overview
    markerLayer.current = clusterLoaded && selectedVehicleId === "all" && !isMiniMap
      ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48 })
      : L.layerGroup();
    markerLayer.current.addTo(map.current);

    const bounds: any[] = [];

    // Filter snapshots based on mini map constraints and visibility
    const targets = isMiniMap ? visibleSnapshots.slice(0, 1) : visibleSnapshots;
    let markerCount = 0;
    let routeCount = 0;

    targets.forEach((snapshot) => {
      const latest = snapshot.latest_location;
      const position = locationPosition(latest);
      if (!latest || !position) {
        console.error("Skipping vehicle with invalid latest_location", {
          vehicle: snapshot.vehicle,
          latest_location: latest,
        });
        return;
      }

      const color = colorMap.get(snapshot.vehicle.id) || "#ef4444";
      bounds.push(position);

      const isFocused = selectedVehicleId === "all" || selectedVehicleId === snapshot.vehicle.id;

      // Draw route path trail
      const routePoints = snapshot.route_history
        .map((point) => locationPosition(point))
        .filter((point): point is [number, number] => Boolean(point));
      if (routePoints.length > 1) {
        routeCount += 1;
        L.polyline(routePoints, { 
          color, 
          weight: isFocused ? 4 : 2, 
          opacity: isFocused ? 0.8 : 0.25 
        }).addTo(routeLayer.current);
      }

      // Draw direction arrow
      const heading = getHeading(snapshot);
      const arrowIcon = L.divIcon({
        className: "vts-direction-arrow",
        html: `<div style="transform: rotate(${heading}deg); color:${color}; font-size: 16px; opacity: ${isFocused ? 1 : 0.3}">▲</div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker(position, { icon: arrowIcon, interactive: false }).addTo(arrowLayer.current);

      // Main circular marker
      const markerIcon = L.divIcon({
        className: "vts-vehicle-marker",
        html: `<div style="background:${color}; opacity: ${isFocused ? 1 : 0.3}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const event = snapshot.latest_event?.event_type || "No events";
      const command = snapshot.latest_command
        ? `${snapshot.latest_command.command_name} (${snapshot.latest_command.status})`
        : "No commands";
      const gpsFix = metricValue(snapshot, ["gps", "fix"]);

      const popup = `
        <div class="vts-popup">
          <strong>${escapeHtml(snapshot.vehicle.vehicle_name)}</strong>
          <code>${escapeHtml(snapshot.vehicle.device_uid)}</code>
          <dl>
            <dt>Status</dt><dd>${snapshot.movement_status} / ${snapshot.health_status}</dd>
            <dt>Speed</dt><dd>${latest.speed.toFixed(1)} km/h</dd>
            <dt>Ignition</dt><dd>${metricValue(snapshot, ["io", "ign"]) === 1 ? "ON" : "OFF"}</dd>
            <dt>GPS</dt><dd>${gpsFix === "A" ? "Valid Fix" : "No Fix"}</dd>
            <dt>Battery</dt><dd>${voltage(snapshot, "battery")}</dd>
            <dt>Main</dt><dd>${voltage(snapshot, "main")}</dd>
            <dt>Coordinates</dt><dd>${latest.latitude.toFixed(5)}, ${latest.longitude.toFixed(5)}</dd>
            <dt>Last Seen</dt><dd>${asUtcDate(latest.timestamp).toLocaleTimeString()}</dd>
          </dl>
          <a href="/vehicles/${snapshot.vehicle.id}">Open Vehicle Profile</a>
        </div>
      `;

      const marker = L.marker(position, { icon: markerIcon });
      
      // Bind descriptive tag labels (similar to target image tags)
      if (!isMiniMap) {
        marker.bindTooltip(snapshot.vehicle.vehicle_name, {
          permanent: true,
          direction: "right",
          className: "vts-map-label",
          offset: [12, 0]
        });
      }

      marker.bindPopup(popup, { maxWidth: 280 }).addTo(markerLayer.current);
      markerCount += 1;

      // Handle marker click selection
      marker.on("click", () => {
        if (onSelectVehicle) {
          onSelectVehicle(snapshot.vehicle.id);
        }
      });
    });

    logMapDebug("Leaflet render pass", {
      leafletLoaded,
      clusterLoaded,
      isMiniMap,
      selectedVehicleId,
      targetVehicleIds: targets.map((snapshot) => snapshot.vehicle.id),
      markerCount,
      routeCount,
      bounds,
    });

    // Auto zoom and center based on visible snapshots
    if (bounds.length === 1 && selectedVehicleId !== "all") {
      map.current.setView(bounds[0], isMiniMap ? 15 : 16, { animate: true });
    } else if (bounds.length > 1) {
      map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: isMiniMap ? 13 : 15 });
    }
  }, [clusterLoaded, colorMap, leafletLoaded, selectedVehicleId, visibleSnapshots, snapshots, isMiniMap]);

  const fitFleet = () => {
    if (!map.current) return;
    const positions = visibleSnapshots
      .map((snapshot) => snapshot.latest_location)
      .map((location) => locationPosition(location))
      .filter((position): position is [number, number] => Boolean(position));
    if (positions.length === 1) map.current.setView(positions[0], 15, { animate: true });
    if (positions.length > 1) map.current.fitBounds(positions, { padding: [60, 60], maxZoom: 15 });
  };

  const zoomSelected = () => {
    if (!map.current || selectedVehicleId === "all") return;
    const snapshot = snapshots.find((item) => item.vehicle.id === selectedVehicleId);
    const position = locationPosition(snapshot?.latest_location ?? null);
    if (position) map.current.setView(position, 17, { animate: true });
  };

  const toggleFullscreen = async () => {
    const element = mapRef.current?.parentElement;
    if (!element) return;
    if (!document.fullscreenElement) {
      await element.requestFullscreen?.();
      setFullscreen(true);
      setTimeout(() => map.current?.invalidateSize(), 250);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
      setTimeout(() => map.current?.invalidateSize(), 250);
    }
  };

  return (
    <div className={`relative w-full ${heightClass} overflow-hidden rounded-xl border border-[#1e294b]/60 bg-[#07111f]`}>
      {!leafletLoaded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#07111f] text-xs font-semibold text-slate-400">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
          Loading map assets...
        </div>
      )}

      {/* Floating Map Control Triggers */}
      {!isMiniMap && (
        <MapControls
          layer={layer}
          fullscreen={fullscreen}
          selectedVehicleId={selectedVehicleId}
          onToggleLayer={() => setLayer(layer === "street" ? "satellite" : "street")}
          onFitFleet={fitFleet}
          onZoomSelected={zoomSelected}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {visibleSnapshots.length === 0 && leafletLoaded && !isMiniMap && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[500] mx-auto w-fit rounded-lg border border-[#1e294b]/60 bg-[#0f172a]/95 px-4 py-2 text-xs font-semibold text-slate-400">
          No vehicles in view range
        </div>
      )}

      <div ref={mapRef} className="h-full w-full" />

      <style jsx global>{TRACKING_MAP_STYLES}</style>
    </div>
  );
}
