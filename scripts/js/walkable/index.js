import { hxDaedalus } from "hxdaedalus-js";
import { drawWalkableGrid, drawPath, deleteDrawingsById } from "./drawing";
import Queue from "promise-queue";
import {
  calculateDistance,
  convertToWaypoints,
  convertDistanceToGridUnits,
} from "./utils";

const RectMesh = hxDaedalus.factories.RectMesh;
const EntityAI = hxDaedalus.ai.EntityAI;
const PathFinder = hxDaedalus.ai.PathFinder;
const DaedalusObject = hxDaedalus.data.Object;

class Walkable {
  constructor() {
    this.removeQueue = new Queue(1, Infinity);
    this.removeIteratorQueue = new Queue(1, Infinity);
    this.queueRemoveDrawings();

    this.mesh = RectMesh.buildRectangle(
      canvas.dimensions.width,
      canvas.dimensions.height
    );

    this.entity = new EntityAI();
    this.pathFinder = new PathFinder();
    this.pathFinder.entity = this.entity;
    this.pathFinder.set_mesh(this.mesh);

    this.path = [];
    this.pathX;
    this.pathY;
    this.walls = {};
    this.walkableGrid = [];
    this.token;
    this.routeLineDrawing;
    this.walkableGridDrawings = [];
    this.blockingTokens = [];

    canvas.scene.data.walls.forEach((wall) => {
      this.addWall(wall);
    });

    Hooks.on("createWall", (scene, sceneID, wall) => {
      this.addWall(wall);
    });

    Hooks.on("updateWall", (scene, sceneID, changes, wallData) => {
      const wall = wallData.currentData;
      if (changes.hasOwnProperty("ds")) {
        wall.ds = changes.ds;
        if (wall.ds === 1) {
          this.deleteWallById(wall._id);
        } else {
          this.addWall(wall);
        }
      } else if (changes.hasOwnProperty("c")) {
        wall.c = changes.c;
        this.deleteWallById(wall._id);
        this.addWall(wall);
      }
    });

    Hooks.on("deleteWall", (scene, sceneID, wallId) => {
      this.deleteWallById(wallId);
    });

    Hooks.on("renderSceneControls", () => {
      if (game.activeTool !== "route-finder") {
        setTimeout(() => {
          this.queueRemoveDrawings();
        }, 100);
      }
    });
  }

  updateToken(token) {
    this.token = token;
    this.pathX = null;
    this.path = [];
    this.pathY = null;
    this.queueRemoveGridDrawings().then(() => {
      if (token) {
        this.updateBlockingTokens();
        this.updateWalkableGrid(30);
        drawWalkableGrid(this.walkableGrid).then((drawings) => {
          this.walkableGridDrawings = drawings;
        });
      }
    });
  }

  addWall(wall) {
    if (
      wall.move === 1 &&
      (wall.door === 0 || (wall.door === 1 && wall.ds === 0))
    ) {
      this.walls[wall._id] = this.addLine(
        wall.c[0],
        wall.c[1],
        wall.c[2],
        wall.c[3]
      );
    }
  }

  updateWalkableGrid(maxDistance) {
    const startTime = new Date().getTime();
    const middle = canvas.grid.getCenter(this.token.x, this.token.y);
    const gridRadius = convertDistanceToGridUnits(maxDistance);
    const distanceGrid = [];
    for (
      let x = middle[0] - canvas.grid.size * gridRadius;
      x < middle[0] + canvas.grid.size * gridRadius;
      x += canvas.grid.size
    ) {
      for (
        let y = middle[1] - canvas.grid.size * gridRadius;
        y < middle[1] + canvas.grid.size * gridRadius;
        y += canvas.grid.size
      ) {
        const path = this.findPath(
          this.token.center.x,
          this.token.center.y,
          x,
          y,
          this.token.width / 3,
          true
        );
        if (path && path.length > 0 && calculateDistance(path) <= maxDistance) {
          distanceGrid.push({ x, y, distance: calculateDistance(path) });
        }
      }
    }
    const endTime = new Date().getTime();
    console.log(
      `Route-Finder | Time: ${endTime - startTime}ms, Radius: ${gridRadius}`,
      distanceGrid
    );
    this.walkableGrid = distanceGrid;
  }

  updateBlockingTokens() {
    const blockers = {
      "-1": {
        "-1": game.settings.get("route-finder", "hostileBlocksHostile"),
        "0": game.settings.get("route-finder", "hostileBlocksNeutral"),
        "1": game.settings.get("route-finder", "hostileBlocksFriendly"),
      },
      "0": {
        "-1": game.settings.get("route-finder", "neutralBlocksHostile"),
        "0": game.settings.get("route-finder", "neutralBlocksNeutral"),
        "1": game.settings.get("route-finder", "neutralBlocksFriendly"),
      },
      "1": {
        "-1": game.settings.get("route-finder", "friendlyBlocksHostile"),
        "0": game.settings.get("route-finder", "friendlyBlocksNeutral"),
        "1": game.settings.get("route-finder", "friendlyBlocksFriendly"),
      },
    };
    this.blockingTokens.forEach((blocker) => {
      console.log("removing blocking");
      this.deleteObstacle(blocker);
    });
    canvas.tokens.placeables.forEach((otherToken) => {
      if (
        otherToken.data._id !== this.token.data._id &&
        blockers[otherToken.data.disposition][this.token.data.disposition]
      ) {
        this.blockingTokens.push(
          this.addRectangle(
            otherToken.x,
            otherToken.y,
            otherToken.w,
            otherToken.h
          )
        );
      }
    });
  }

  addRectangle(x, y, w, h) {
    var obj = new DaedalusObject();
    obj.set_coordinates([0, 0, 0, h, 0, h, w, h, w, h, w, 0, w, 0, 0, 0]);
    obj.set_x(x);
    obj.set_y(y);
    this.mesh.insertObject(obj);
    return obj;
  }

  addLine(startX, startY, endX, endY) {
    var obj = new DaedalusObject();
    obj.set_coordinates([0, 0, endX - startX, endY - startY]);
    obj.set_x(startX);
    obj.set_y(startY);
    this.mesh.insertObject(obj);
    return obj;
  }

  deleteWallById(wallId) {
    if (this.walls[wallId]) {
      this.mesh.deleteObject(this.walls[wallId]);
    }
  }

  deleteObstacle(obj) {
    this.mesh.deleteObject(obj);
  }

  displayPath(endX, endY, snapToGrid) {
    if (this.token) {
      const path = this.findPath(
        this.token.center.x,
        this.token.center.y,
        endX,
        endY,
        snapToGrid
      );
      this.queueRemovePathDrawings().then(() => {
        drawPath(path, this.token).then((drawnPath) => {
          this.routeLineDrawing = drawnPath;
        });
      });
    }
  }

  getPathWaypoints(endX, endY, snapToGrid) {
    const path = this.findPath(
      this.token.center.x,
      this.token.center.y,
      endX,
      endY,
      snapToGrid
    );
    return convertToWaypoints(path);
  }

  findPath(startX, startY, endX, endY, snapToGrid) {
    this.entity.set_radius(this.token.width / 3);
    this.entity.x = startX;
    this.entity.y = startY;
    if (snapToGrid) {
      const snappedPosition = canvas.grid.getCenter(endX, endY);
      if (
        snappedPosition[0] !== this.pathX &&
        snappedPosition[1] !== this.pathY
      ) {
        this.pathX = snappedPosition[0];
        this.pathY = snappedPosition[1];
        this.pathFinder.findPath(
          snappedPosition[0],
          snappedPosition[1],
          this.path
        );
      }
    } else {
      if (endX !== this.pathX && endY !== this.pathY) {
        this.pathFinder.findPath(endX, endY, this.path);
      }
    }

    return this.path;
  }

  queueRemoveGridDrawings() {
    const ids = [];
    canvas.drawings.placeables.forEach((drawing) => {
      if (
        drawing.author.isSelf &&
        typeof drawing.data.flags === "object" &&
        drawing.data.flags["routeFinderGrid"] === true
      ) {
        ids.push(drawing.id);
      }
    });
    return deleteDrawingsById(ids);
  }

  queueRemovePathDrawings() {
    const ids = [];
    canvas.drawings.placeables.forEach((drawing) => {
      if (
        drawing.author.isSelf &&
        typeof drawing.data.flags === "object" &&
        drawing.data.flags["routeFinderLine"] === true
      ) {
        ids.push(drawing.id);
      }
    });
    return deleteDrawingsById(ids);
  }

  queueRemoveDrawings(id) {
    if (id) {
      return deleteDrawingsById(id);
    } else {
      const ids = [];
      canvas.drawings.placeables.forEach((drawing) => {
        if (
          drawing.author.isSelf &&
          typeof drawing.data.flags === "object" &&
          (drawing.data.flags["routeFinderLine"] === true ||
            drawing.data.flags["routeFinderGrid"] === true)
        ) {
          ids.push(drawing.id);
        }
      });
      return deleteDrawingsById(ids);
    }
  }
}

export default Walkable;
