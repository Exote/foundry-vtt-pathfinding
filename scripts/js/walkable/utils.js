function calculateDistance(path) {
  const waypoints = convertToWaypoints(path);
  let totalPixelDistance = 0;
  let lastWaypoint = waypoints[0];
  for (let i = 1; i < waypoints.length; i++) {
    const dX = waypoints[i][0] - lastWaypoint[0];
    const dY = waypoints[i][1] - lastWaypoint[1];
    totalPixelDistance += Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2));
    lastWaypoint = waypoints[i];
  }
  return convertPixelsToDistance(totalPixelDistance);
}

function convertToWaypoints(path) {
  const waypoints = [];
  for (let i = 0; i < path.length; i += 2) {
    waypoints.push([path[i], path[i + 1]]);
  }
  return waypoints;
}

function convertPixelsToDistance(pixels) {
  return Math.round(
    (pixels / canvas.dimensions.size) * canvas.dimensions.distance
  );
}

function convertDistanceToPixels(distance) {
  return Math.round(
    (distance / canvas.dimensions.distance) * canvas.dimensions.size
  );
}

function convertDistanceToGridUnits(distance) {
  return Math.floor(convertDistanceToPixels(distance) / canvas.grid.size);
}

export {
  calculateDistance,
  convertToWaypoints,
  convertPixelsToDistance,
  convertDistanceToPixels,
  convertDistanceToGridUnits,
};
