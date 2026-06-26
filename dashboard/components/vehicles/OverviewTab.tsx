import React from "react";
import { VehicleTrackingSnapshot } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Detail } from "./VehicleBadges";
import { formatDate } from "../../lib/date";
import { voltage } from "../../utils/trackingMap";

interface OverviewTabProps {
  snapshot: VehicleTrackingSnapshot;
  vehicleId: number;
}

function gpsStatus(snapshot: VehicleTrackingSnapshot | null) {
  const gps =
    snapshot?.latest_location?.extra_data?.gps_details ??
    snapshot?.latest_location?.extra_data?.gps;
  if (gps?.fix === "A") return `Valid${gps.sat ? ` (${gps.sat} sats)` : ""}`;
  if (gps?.fix === "V") return "No fix";
  return "N/A";
}

export function OverviewTab({ snapshot, vehicleId }: OverviewTabProps) {
  return (
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
          <Detail
            label="Latitude"
            value={snapshot.latest_location?.latitude.toFixed(6) || "N/A"}
            mono
          />
          <Detail
            label="Longitude"
            value={snapshot.latest_location?.longitude.toFixed(6) || "N/A"}
            mono
          />
          <Detail
            label="Current Speed"
            value={
              snapshot.latest_location
                ? `${snapshot.latest_location.speed.toFixed(1)} km/h`
                : "N/A"
            }
          />
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
          <Detail
            label="Firmware Version"
            value={
              snapshot.device_config?.firmware_version ||
              snapshot.latest_location?.extra_data?.dbg?.ver?.[0] ||
              "N/A"
            }
          />
          <Detail
            label="Hardware Revision"
            value={
              snapshot.device_config?.hardware_version ||
              snapshot.latest_location?.extra_data?.dbg?.ver?.[1] ||
              "N/A"
            }
          />
          <Detail label="Recent Active Event" value={snapshot.latest_event?.event_type || "No events"} />
        </CardContent>
      </Card>
    </div>
  );
}
