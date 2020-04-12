import { calculateDistance, convertToWaypoints } from "./utils";

function drawWalkableGrid(grid) {
  return new Promise((resolve) => {
    if (grid && grid.length > 0) {
      const drawingsData = [];
      grid.forEach((gridItem) => {
        drawingsData.push({
          type: CONST.DRAWING_TYPES.RECTANGLE,
          author: game.user._id,
          x: gridItem.x - canvas.grid.size / 2,
          y: gridItem.y - canvas.grid.size / 2,
          width: canvas.grid.size,
          height: canvas.grid.size,
          fillType: CONST.DRAWING_FILL_TYPES.SOLID,
          strokeWidth: canvas.grid.size / 3,
          strokeColor: game.user.color,
          strokeAlpha: 0.0,
          fillColor: game.user.color,
          fillAlpha: 0.15,
          flags: { routeFinderGrid: true },
        });
      });
      canvas.scene
        .createManyEmbeddedEntities("Drawing", drawingsData)
        .then((drawings) => {
          resolve(drawings);
        });
    } else {
      resolve();
    }
  });
}

function drawPath(path) {
  return new Promise((resolve) => {
    const drawingDetails = {
      type: CONST.DRAWING_TYPES.POLYGON,
      author: game.user._id,
      x: 0,
      y: 0,
      points: convertToWaypoints(path),
      strokeWidth: 15,
      strokeColor: game.user.color,
      strokeAlpha: 0.7,
      text: calculateDistance(path) + game.scenes.viewed.data.gridUnits,
      fontSize: 48,
      textColor: game.user.color,
      flags: { routeFinderLine: true },
    };
    Drawing.create(drawingDetails).then((drawing) => {
      resolve(drawing);
    });
  });
}

function deleteDrawingsById(ids) {
  if (ids && ids.length > 1) {
    return canvas.scene.deleteManyEmbeddedEntities("Drawing", ids);
  } else if (ids && ids.length === 1) {
    return canvas.scene.deleteEmbeddedEntity("Drawing", ids[0]);
  } else {
    return Promise.resolve();
  }
}

export { drawWalkableGrid, drawPath, deleteDrawingsById };
