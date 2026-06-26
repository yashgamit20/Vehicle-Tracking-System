from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    device_uid = Column(String, unique=True, index=True, nullable=False)
    vehicle_name = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    last_seen = Column(DateTime, nullable=True)

    # Relationships
    locations = relationship("Location", back_populates="vehicle", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="vehicle", cascade="all, delete-orphan")
    device_config = relationship("DeviceConfig", back_populates="vehicle", uselist=False, cascade="all, delete-orphan")
    device_commands = relationship("DeviceCommand", back_populates="vehicle", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Vehicle id={self.id} device_uid='{self.device_uid}' name='{self.vehicle_name}'>"
