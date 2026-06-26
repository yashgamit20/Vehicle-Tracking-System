import { useEffect, useMemo, useState } from "react";
import { VehicleTrackingSnapshot } from "../types";
import { haversineKm } from "../utils/geo";

export interface RouteStats {
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
}

export function useVehicleDetailsPlayback(snapshot: VehicleTrackingSnapshot | null) {
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

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
      route_history: history.slice(0, playbackIndex + 1),
    };
  }, [snapshot, playbackActive, playbackIndex]);

  const routeStats = useMemo<RouteStats>(() => {
    const route = snapshot?.route_history || [];
    const distance = route
      .slice(1)
      .reduce((sum, point, index) => sum + haversineKm(route[index], point), 0);
    const avgSpeed = route.length
      ? route.reduce((sum, point) => sum + point.speed, 0) / route.length
      : 0;
    const maxSpeed = route.length
      ? Math.max(...route.map((point) => point.speed))
      : 0;
    return { distance, avgSpeed, maxSpeed };
  }, [snapshot]);

  return {
    playbackActive,
    setPlaybackActive,
    playbackIndex,
    setPlaybackIndex,
    activeSnapshot,
    routeStats,
  };
}
