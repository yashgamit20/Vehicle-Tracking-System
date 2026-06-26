from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.device_command import DeviceCommandResponse
from app.schemas.device_config import DeviceConfigResponse
from app.schemas.event import EventResponse
from app.schemas.location import LocationResponse


class VehicleBase(BaseModel):
    device_uid: str = Field(..., description="Unique alphanumeric hardware ID of the tracking device")
    vehicle_name: str = Field(..., description="Human-readable name of the vehicle")
    vehicle_type: str = Field(..., description="Type of vehicle, e.g., Car, Truck, Bike")


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    device_uid: Optional[str] = Field(None, description="Updated hardware ID")
    vehicle_name: Optional[str] = Field(None, description="Updated vehicle name")
    vehicle_type: Optional[str] = Field(None, description="Updated vehicle type")


class VehicleResponse(VehicleBase):
    id: int
    created_at: datetime
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class VehicleTrackingSnapshot(BaseModel):
    vehicle: VehicleResponse
    latest_location: Optional[LocationResponse] = None
    route_history: List[LocationResponse] = Field(default_factory=list)
    latest_event: Optional[EventResponse] = None
    latest_command: Optional[DeviceCommandResponse] = None
    device_config: Optional[DeviceConfigResponse] = None
    health_status: Literal["Healthy", "Warning", "Offline"]
    movement_status: Literal["Moving", "Stopped", "Offline"]
    packet_count: int = 0
