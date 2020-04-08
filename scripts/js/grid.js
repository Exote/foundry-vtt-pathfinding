import Queue from "promise-queue";
import PF from "pathfinding";

class PathfindingGrid {
  constructor(gridResolution) {
    this.gridSquareSize = Math.round(canvas.dimensions.size / gridResolution);
    this.maxX = canvas.dimensions.width / this.gridSquareSize;
    this.maxY = canvas.dimensions.height / this.gridSquareSize;
    this.updateQueue = new Queue(1, Infinity);
    this.update();
  }

  checkInBounds(x, y, minX, maxX, minY, maxY) {
    if (x < maxX && x >= minX && y < maxY && y >= minY) {
      return true;
    }
    return false;
  }

  setNotWalkable(x, y, grid) {
    if (this.checkInBounds(x, y, 0, this.maxX, 0, this.maxY)) {
      grid.setWalkableAt(x, y, false);
    }
    return grid;
  }

  update() {
    this.updateQueue.add(() => {
      return new Promise((resolve) => {
        const localSceneGrid = new PF.Grid(
          Math.ceil(this.maxX),
          Math.ceil(this.maxY)
        );
        canvas.scene.data.walls.forEach((wall) => {
          if (
            wall.move === 1 &&
            (wall.door === 0 || (wall.door === 1 && wall.ds === 0))
          ) {
            const startX = wall.c[0] / this.gridSquareSize;
            const startY = wall.c[1] / this.gridSquareSize;
            const endX = Math.round(wall.c[2] / this.gridSquareSize);
            const endY = Math.round(wall.c[3] / this.gridSquareSize);
            const deltaX = endX - startX;
            const dirX = deltaX >= 0 ? 1 : -1;
            const deltaY = endY - startY;
            const dirY = deltaY >= 0 ? 1 : -1;
            const ratio = deltaY / deltaX;
            let currentX = startX;
            let currentY = startY;
            if (ratio <= 1 && ratio >= -1) {
              while (
                Math.round(currentX) !== endX &&
                currentX >= 0 &&
                currentX <= this.maxX
              ) {
                localSceneGrid.setWalkableAt(
                  Math.floor(currentX),
                  Math.floor(currentY),
                  false
                );
                localSceneGrid.setWalkableAt(
                  Math.floor(currentX),
                  Math.ceil(currentY),
                  false
                );
                localSceneGrid.setWalkableAt(
                  Math.ceil(currentX),
                  Math.floor(currentY),
                  false
                );
                localSceneGrid.setWalkableAt(
                  Math.ceil(currentX),
                  Math.ceil(currentY),
                  false
                );
                currentY += dirX * ratio;
                currentX += dirX;
              }
            } else {
              while (
                Math.round(currentY) !== endY &&
                currentY >= 0 &&
                currentY <= this.maxY
              ) {
                localSceneGrid.setWalkableAt(
                  Math.floor(currentX),
                  Math.floor(currentY),
                  false
                );
                localSceneGrid.setWalkableAt(
                  Math.floor(currentX),
                  Math.ceil(currentY),
                  false
                );
                localSceneGrid.setWalkableAt(
                  Math.ceil(currentX),
                  Math.floor(currentY),
                  false
                );
                localSceneGrid.setWalkableAt(
                  Math.ceil(currentX),
                  Math.ceil(currentY),
                  false
                );
                currentX += dirY * (1 / ratio);
                currentY += dirY;
              }
            }
          }
        });
        this.sceneGrid = localSceneGrid;
        resolve();
      });
    });
  }

  findPath(startX, startY, endX, endY, token) {
    const finder = new PF.AStarFinder({
      allowDiagonal: true,
      dontCrossCorners: false,
    });
    const path = finder.findPath(
      Math.round(startX / this.gridSquareSize),
      Math.round(startY / this.gridSquareSize),
      Math.round(endX / this.gridSquareSize),
      Math.round(endY / this.gridSquareSize),
      this.sceneGrid.clone()
    );
    const normalisedPath = [];
    path.forEach((coordinate) => {
      normalisedPath.push([
        Math.round(coordinate[0] * this.gridSquareSize - token.width / 2),
        Math.round(coordinate[1] * this.gridSquareSize - token.height / 2),
      ]);
    });
    return normalisedPath;
  }

  drawPath(path, token) {
    return new Promise((resolve) => {
      const adjustedPath = [];
      path.forEach((waypoint) => {
        adjustedPath.push([
          waypoint[0] + token.width / 2,
          waypoint[1] + token.height / 2,
        ]);
      });
      const drawingDetails = {
        type: CONST.DRAWING_TYPES.POLYGON,
        author: game.user._id,
        x: 0,
        y: 0,
        points: adjustedPath,
        strokeWidth: 15,
        strokeColor: game.user.color,
        strokeAlpha: 0.7,
        text:
          Math.round(
            ((path.length * this.gridSquareSize) / canvas.dimensions.size) *
              canvas.dimensions.distance
          ) + game.scenes.viewed.data.gridUnits,
        fontSize: 48,
        textColor: game.user.color,
      };
      Drawing.create(drawingDetails).then((drawing) => {
        resolve(drawing);
      });
    });
  }

  drawGrid() {
    this.sceneGrid.nodes.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell.walkable) {
          const drawingDetails = {
            type: CONST.DRAWING_TYPES.RECTANGLE,
            author: game.user._id,
            x: x * this.gridSquareSize - this.gridSquareSize / 2,
            y: y * this.gridSquareSize - this.gridSquareSize / 2,
            width: this.gridSquareSize,
            height: this.gridSquareSize,
            strokeColor: "#000000",
          };
          Drawing.create(drawingDetails);
        }
      });
    });
  }
}

export default PathfindingGrid;
