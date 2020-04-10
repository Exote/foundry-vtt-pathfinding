"use strict";
import Queue from "promise-queue";
import Walkable from "./walkable";

class Pathfinding {
  constructor() {
    this.moveQueue = new Queue(1, Infinity);
    this.deleteQueue = new Queue(1, Infinity);
    this.walkable;
    this.messageDialog;
    this.lastDrawnPath;
    this.lastPath;
    this.countdown;

    Hooks.on("canvasReady", () => {
      this.walkable = new Walkable();
      canvas.stage.on("mousemove", (event) => this.mousemoveListener(event));
      canvas.stage.on("rightup", (event) => this.rightupListener(event));
    });

    Hooks.on("createWall", (scene, sceneID, wall) => {
      this.walkable.addWall(wall);
    });

    Hooks.on("updateWall", (scene, sceneID, changes, wallData) => {
      const wall = wallData.currentData;
      if (changes.hasOwnProperty("ds")) {
        wall.ds = changes.ds;
        if (wall.ds === 1) {
          this.walkable.deleteWallById(wall._id);
        } else {
          this.walkable.addWall(wall);
        }
      } else if (changes.hasOwnProperty("c")) {
        wall.c = changes.c;
        this.walkable.deleteWallById(wall._id);
        this.walkable.addWall(wall);
      }
    });

    Hooks.on("deleteWall", (scene, sceneID, wallId) => {
      this.walkable.deleteWallById(wallId);
    });

    Hooks.on("controlToken", (token, control) => {
      if (!control) {
        if (this.lastDrawnPath) {
          this.deleteDrawingById(this.lastDrawnPath._id);
        }
      }
    });

    Hooks.on("getSceneControlButtons", (buttons) => {
      let tokenButton = buttons.find((button) => button.name === "token");
      if (tokenButton) {
        tokenButton.tools.push({
          name: "pathfinding",
          title: "Pathfinding",
          icon: "fas fa-route",
          visible: true,
          onClick: () => {
            if (canvas.tokens.controlledTokens.length === 1) {
              if (game.paused) {
                this.displayMessage(
                  game.i18n.localize("pathfinding.errors.gamePaused")
                );
              }
            } else if (canvas.tokens.controlledTokens.length > 1) {
              this.displayMessage(
                game.i18n.localize("pathfinding.errors.tooManyTokens")
              );
            } else {
              this.displayMessage(
                game.i18n.localize("pathfinding.errors.tooFewTokens")
              );
            }
          },
        });
      }
    });

    Hooks.on("renderSceneControls", () => {
      if (game.activeTool !== "pathfinding" && this.lastDrawnPath) {
        setTimeout(() => {
          this.deleteDrawingById(this.lastDrawnPath._id);
        }, 100);
      }
    });
  }

  moveTokenToWaypoint(token, waypoint) {
    return this.moveQueue.add(() => {
      return new Promise((resolve) => {
        if (token) {
          const x = waypoint[0] - token.width / 2;
          const y = waypoint[1] - token.height / 2;
          let complete = false;
          setTimeout(() => {
            if (!complete) {
              resolve();
            }
          }, 3000);
          if (token) {
            token.setPosition(x, y).then(() => {
              token.update({ x, y }).then(() => {
                setTimeout(() => {
                  complete = true;
                  resolve();
                }, 20);
              });
            });
          } else {
            complete = true;
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  }

  displayMessage(message) {
    if (!this.messageDialog || !this.messageDialog.rendered) {
      this.messageDialog = new Dialog(
        {
          title: "Pathfinding",
          content: `<p>${message}</p>`,
          buttons: {
            dismiss: {
              icon: '<i class="fas fa-times"></i>',
              label: "Close",
              callback: () => {
                this.messageDialog = null;
              },
            },
          },
          close: () => {
            this.messageDialog = null;
          },
        },
        { width: 300 }
      ).render(true);
    }
  }

  deleteDrawingById(id) {
    return this.deleteQueue.add(() => {
      return new Promise((resolve) => {
        let found = false;
        canvas.drawings.placeables.forEach((placeable) => {
          if (placeable.id === id) {
            found = true;
            placeable.delete().finally(() => {
              resolve();
            });
          }
        });
        if (!found) {
          resolve();
        }
      });
    });
  }

  mousemoveListener(event) {
    if (
      !game.paused &&
      game.activeTool === "pathfinding" &&
      this.moveQueue.getPendingLength() === 0 &&
      this.moveQueue.getQueueLength() === 0
    ) {
      if (this.countdown) {
        clearTimeout(this.countdown);
      }
      this.countdown = setTimeout(() => {
        const token = canvas.tokens.controlledTokens[0];
        if (token) {
          const path = this.walkable.findPath(
            token.center.x,
            token.center.y,
            event.data.destination.x,
            event.data.destination.y,
            token.width / 3
          );
          if (this.lastDrawnPath) {
            this.deleteDrawingById(this.lastDrawnPath._id).then(() => {
              this.walkable.drawPath(path, token).then((drawnPath) => {
                this.lastDrawnPath = drawnPath;
                this.lastPath = path;
              });
            });
          } else {
            this.walkable.drawPath(path, token).then((drawnPath) => {
              this.lastDrawnPath = drawnPath;
              this.lastPath = path;
            });
          }
        }
      }, 100);
    }
  }

  rightupListener(event) {
    if (
      this.lastDrawnPath &&
      this.lastPath &&
      this.lastPath.length > 0 &&
      !game.paused &&
      game.activeTool === "pathfinding" &&
      this.moveQueue.getPendingLength() === 0 &&
      this.moveQueue.getQueueLength() === 0
    ) {
      const token = canvas.tokens.controlledTokens[0];
      const movePromises = [];
      this.walkable.convertToWaypoints(this.lastPath).forEach((waypoint) => {
        movePromises.push(this.moveTokenToWaypoint(token, waypoint));
      });
      Promise.all(movePromises).then(() => {
        this.deleteDrawingById(this.lastDrawnPath._id);
      });
    }
  }
}

Hooks.on("init", () => {
  const pathfinding = new Pathfinding();
});
CONFIG.debug.hooks = true;
