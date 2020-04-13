class Config {
  constructor() {
    game.settings.register("route-finder", "snapToGrid", {
      name: game.i18n.localize("route-finder.snapToGrid.name"),
      hint: game.i18n.localize("route-finder.snapToGrid.hint"),
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
    });

    game.settings.register("route-finder", "reportMoveToChat", {
      name: game.i18n.localize("route-finder.reportMoveToChat.name"),
      hint: game.i18n.localize("route-finder.reportMoveToChat.hint"),
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
    });

    game.settings.register("route-finder", "friendlyBlocksFriendly", {
      name: game.i18n.localize("route-finder.friendlyBlocksFriendly.name"),
      hint: game.i18n.localize("route-finder.friendlyBlocksFriendly.hint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });
    game.settings.register("route-finder", "friendlyBlocksNeutral", {
      name: game.i18n.localize("route-finder.friendlyBlocksNeutral.name"),
      hint: game.i18n.localize("route-finder.friendlyBlocksNeutral.hint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });
    game.settings.register("route-finder", "friendlyBlocksHostile", {
      name: game.i18n.localize("route-finder.friendlyBlocksHostile.name"),
      hint: game.i18n.localize("route-finder.friendlyBlocksHostile.hint"),
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
    });

    game.settings.register("route-finder", "neutralBlocksFriendly", {
      name: game.i18n.localize("route-finder.neutralBlocksFriendly.name"),
      hint: game.i18n.localize("route-finder.neutralBlocksFriendly.hint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });
    game.settings.register("route-finder", "neutralBlocksNeutral", {
      name: game.i18n.localize("route-finder.neutralBlocksNeutral.name"),
      hint: game.i18n.localize("route-finder.neutralBlocksNeutral.hint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });
    game.settings.register("route-finder", "neutralBlocksHostile", {
      name: game.i18n.localize("route-finder.neutralBlocksHostile.name"),
      hint: game.i18n.localize("route-finder.neutralBlocksHostile.hint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });

    game.settings.register("route-finder", "hostileBlocksFriendly", {
      name: game.i18n.localize("route-finder.hostileBlocksFriendly.name"),
      hint: game.i18n.localize("route-finder.hostileBlocksFriendly.hint"),
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
    });
    game.settings.register("route-finder", "hostileBlocksNeutral", {
      name: game.i18n.localize("route-finder.hostileBlocksNeutral.name"),
      hint: game.i18n.localize("route-finder.hostileBlocksNeutral.hint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });
    game.settings.register("route-finder", "hostileBlocksHostile", {
      name: game.i18n.localize("route-finder.hostileBlocksHostile.name"),
      hint: game.i18n.localize("route-finder.hostileBlocksHostile.hint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });
  }
}

export default Config;
