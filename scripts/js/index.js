"use strict";
import Queue from "promise-queue";
import Walkable from "./walkable";
import Config from "./config";

class RouteFinder {
  constructor() {
    this.config = new Config();
    this.moveQueue = new Queue(1, Infinity);
    this.deleteQueue = new Queue(1, Infinity);
    this.walkable;
    this.messageDialog;
    this.lastPath;
    this.countdown;

    Hooks.on("canvasReady", () => {
      this.walkable = new Walkable();
      this.deleteAllOwnRoutes();
      canvas.stage.on("mousemove", (event) => this.mousemoveListener(event));
      canvas.stage.on("rightup", (event) => this.rightupListener(event));
      if (
        game.modules.get("pathfinding") &&
        game.modules.get("pathfinding").active
      ) {
        this.displayMessage(
          game.i18n.localize("route-finder.errors.oldNameFound")
        );
      }
    });

    Hooks.on("createWall", (scene, wall) => {
      this.walkable.addWall(wall);
    });

    Hooks.on("updateWall", (scene, wall, changes) => {
      if (changes.hasOwnProperty("ds")) {
        if (wall.ds === 1) {
          this.walkable.deleteWallById(changes._id);
        } else {
          this.walkable.addWall(wall);
        }
      } else if (changes.hasOwnProperty("c")) {
        this.walkable.deleteWallById(wall._id);
        this.walkable.addWall(wall);
      }
    });

    Hooks.on("deleteWall", (scene, wallId) => {
      this.walkable.deleteWallById(wallId);
    });

    Hooks.on("controlToken", (token, control) => {
      if (this.walkable) {
        if (!control) {
          this.deleteAllOwnRoutes();
        } else {
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
          this.walkable.updateBlockingTokens(token, blockers);
        }
      }
    });

    Hooks.on("getSceneControlButtons", (buttons) => {
      let tokenButton = buttons.find((button) => button.name === "token");
      if (tokenButton) {
        tokenButton.tools.push({
          name: "route-finder",
          title: "Route Finder",
          icon: "fas fa-route",
          visible: true,
          onClick: () => {
            if (canvas.tokens.controlled.length === 1) {
              if (game.paused) {
                this.displayMessage(
                  game.i18n.localize("route-finder.errors.gamePaused")
                );
              }
            } else if (canvas.tokens.controlled.length > 1) {
              this.displayMessage(
                game.i18n.localize("route-finder.errors.tooManyTokens")
              );
            } else {
              this.displayMessage(
                game.i18n.localize("route-finder.errors.tooFewTokens")
              );
            }
          },
        });
      }
    });

    Hooks.on("renderSceneControls", () => {
      if (game.activeTool !== "route-finder") {
        setTimeout(() => {
          this.deleteAllOwnRoutes();
        }, 100);
      }
    });
  }

  moveTokenToWaypoint(token, waypoint) {
    return this.moveQueue.add(() => {
      return new Promise((resolve) => {
        if (token) {
          const x = waypoint[0] - token.w / 2;
          const y = waypoint[1] - token.h / 2;
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
          title: "Route Finding",
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
            canvas.scene.deleteEmbeddedEntity("Drawing", id).finally(() => {
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

  deleteAllOwnRoutes() {
    return this.deleteQueue.add(() => {
      const ids = [];
      canvas.drawings.placeables.forEach((drawing) => {
        if (
          drawing.author.isSelf &&
          drawing.data.flags.length > 0 &&
          drawing.data.flags.includes("routeFinderPath")
        ) {
          ids.push(drawing.id);
        }
      });
      return canvas.scene.deleteEmbeddedEntity("Drawing", ids);
    });
  }

  mousemoveListener(event) {
    if (
      !game.paused &&
      game.activeTool === "route-finder" &&
      this.moveQueue.getPendingLength() === 0 &&
      this.moveQueue.getQueueLength() === 0
    ) {
      if (this.countdown) {
        clearTimeout(this.countdown);
      }
      this.countdown = setTimeout(() => {
        const token = canvas.tokens.controlled[0];
        if (token) {
          const dest = event.data.getLocalPosition(canvas.stage);
          const path = this.walkable.findPath(
            token.center.x,
            token.center.y,
            dest.x,
            dest.y,
            token.w / 3,
            game.settings.get("route-finder", "snapToGrid")
          );
          this.deleteAllOwnRoutes().then(() => {
            this.walkable.drawPath(path, token).then(() => {
              this.lastPath = path;
            });
          });
        }
      }, 100);
    }
  }

  rightupListener(event) {
    if (
      this.lastPath &&
      this.lastPath.length > 0 &&
      !game.paused &&
      game.activeTool === "route-finder" &&
      this.moveQueue.getPendingLength() === 0 &&
      this.moveQueue.getQueueLength() === 0
    ) {
      const token = canvas.tokens.controlled[0];
      const movePromises = [];
      this.walkable.convertToWaypoints(this.lastPath).forEach((waypoint) => {
        movePromises.push(this.moveTokenToWaypoint(token, waypoint));
      });
      Promise.all(movePromises).then(() => {
        this.deleteAllOwnRoutes().then(() => {
          if (game.settings.get("route-finder", "reportMoveToChat")) {
            let chatData = {
              content: `Moved: <b>${
                this.walkable.calculateDistance(this.lastPath) +
                game.scenes.viewed.data.gridUnits
              }</b>`,
              type: CONST.CHAT_MESSAGE_TYPES.OTHER,
              speaker: ChatMessage.getSpeaker({ user: game.user }),
            };
            if (token.data.hidden) {
              chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
            }
            ChatMessage.create(chatData);
          }
          this.lastPath = null;
        });
      });
    }
  }
}

Hooks.on("init", () => {
  const routeFinder = new RouteFinder();
});
