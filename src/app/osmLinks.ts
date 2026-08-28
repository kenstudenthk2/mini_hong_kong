export type Coordinates = readonly [longitude: number, latitude: number]

export function openStreetMapMarkerUrl([longitude, latitude]: Coordinates, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`
}
