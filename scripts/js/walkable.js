import { hxDaedalus } from "hxdaedalus-js";

const RectMesh = hxDaedalus.factories.RectMesh;
const EntityAI = hxDaedalus.ai.EntityAI;
const PathFinder = hxDaedalus.ai.PathFinder;
const DaedalusObject = hxDaedalus.data.Object;

class Walkable {
  constructor() {
    this.mesh = RectMesh.buildRectangle(
      canvas.dimensions.width,
      canvas.dimensions.height
    );
    this.entity = new EntityAI();
    this.pathFinder = new PathFinder();
    this.pathFinder.entity = this.entity;
    this.pathFinder.set_mesh(this.mesh);
    this.path = [];
    this.objects = [];
    canvas.scene.data.walls.forEach((wall) => {
      this.addWall(wall);
    });
  }

  addWall(wall) {
    if (
      wall.move === 1 &&
      (wall.door === 0 || (wall.door === 1 && wall.ds === 0))
    ) {
      this.objects[wall._id] = this.addLine(
        wall.c[0],
        wall.c[1],
        wall.c[2],
        wall.c[3]
      );
    }
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
    if (this.objects[wallId]) {
      this.mesh.deleteObject(this.objects[wallId]);
    }
  }

  deleteObstacle(obj) {
    this.mesh.deleteObject(obj);
  }

  findPath(startX, startY, endX, endY, radius) {
    this.entity.set_radius(radius);
    this.entity.x = startX;
    this.entity.y = startY;

    this.pathFinder.findPath(endX, endY, this.path);

    return this.path;
  }

  convertToWaypoints(path) {
    const waypoints = [];
    for (let i = 0; i < path.length; i += 2) {
      waypoints.push([path[i], path[i + 1]]);
    }
    return waypoints;
  }

  calculateDistance(path) {
    const waypoints = this.convertToWaypoints(path);
    let totalPixelDistance = 0;
    let lastWaypoint = waypoints[0];
    for (let i = 1; i < waypoints.length; i++) {
      const dX = waypoints[i][0] - lastWaypoint[0];
      const dY = waypoints[i][1] - lastWaypoint[1];
      totalPixelDistance += Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2));
      lastWaypoint = waypoints[i];
    }
    return Math.round(
      (totalPixelDistance / canvas.dimensions.size) * canvas.dimensions.distance
    );
  }

  drawPath(path) {
    return new Promise((resolve) => {
      const drawingDetails = {
        type: CONST.DRAWING_TYPES.POLYGON,
        author: game.user._id,
        x: 0,
        y: 0,
        points: this.convertToWaypoints(path),
        strokeWidth: 15,
        strokeColor: game.user.color,
        strokeAlpha: 0.7,
        text: this.calculateDistance(path) + game.scenes.viewed.data.gridUnits,
        fontSize: 48,
        textColor: game.user.color,
      };
      Drawing.create(drawingDetails).then((drawing) => {
        resolve(drawing);
      });
    });
  }
}

export default Walkable;
