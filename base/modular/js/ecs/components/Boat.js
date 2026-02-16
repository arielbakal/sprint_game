export const Boat = 'Boat';

export function createBoat(data = {}) {
  return {
    entityId: data.entityId,
    speed: data.speed || 5,
    turnSpeed: data.turnSpeed || 2,
    hasDriver: data.hasDriver || false,
    driverEntity: data.driverEntity || null,
    capacity: data.capacity || 1,
    isAnchored: data.isAnchored || false
  };
}
