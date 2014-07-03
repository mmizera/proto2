//
//	asteroids prototype 2 [ by Acko, 08.05.2014 ]
//	


// augment javascript

Math.roundTo = function(num, to) {
    to = to || 0;
    return +(Math.round(num + ("e+" + to)) + ("e-" + to)); // nasty hack (mozzila does this xD https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round)
}

Math.randomInt = function(low, high) {
    if (low === high && typeof low === 'number') {
        return low;
    }

    low = low || 0;
    high = high || 99999999;

    return Math.floor((Math.random() * (high - low + 1)) + low);
}

Math.randomFloat = function(low, high, decimalPlaces) {
    low = low || 0;
    high = high || 99999999;
    decimalPlaces = decimalPlaces || 2;

    return Math.roundTo((Math.random() * (high - low) + low), decimalPlaces);
}

var asteroids = (function(asteroids) {

        var Key = asteroids.Key = function() {};
        asteroids.Key.SPACE       = 32;
        asteroids.Key.ARROW_LEFT  = 37;
        asteroids.Key.ARROW_UP    = 38;
        asteroids.Key.ARROW_RIGHT = 39;
        
        asteroids.Key.A           = 65;
        asteroids.Key.D           = 68;
        asteroids.Key.G           = 71;
        asteroids.Key.W           = 87;

        var Direction = asteroids.Direction = function() {};
        asteroids.Direction.NORTH          = [0, -1];
        asteroids.Direction.SOUTH          = [0, 1];
        asteroids.Direction.WEST           = [-1, 0];
        asteroids.Direction.EAST           = [1, 0];
        
        var Settings                       = asteroids.Settings = function() {};
        Settings.GENERATE_ASTEROIDS        = true;
        Settings.GENERATE_PERKS            = false;
        Settings.SHIP_IMMORTAL             = false;
        Settings.SHIP_CANNONS_LEVEL        = 0; // starts from zero
        Settings.SHIP_FIRE_RATE            = [100, 300];    // [min, max] in milis
        Settings.SHOW_FPS                  = true;
        Settings.MULTIPLAYER               = false;    // if true, second ship will be added
        Settings.ALLOW_ENDGAME             = false; // normally, game will end in case world does not contains any drawables with ship class. 
        Settings.GENERATE_ASTEROIDS_RATE   = [500, 1000];   // in milis, low and high boundary. Random ms value within these bounds is time between generation of next asteroid. 
        Settings.PERK_LIFESPAN             = [999, 999];   // [min, max] in sec. (default [5,15])
        Settings.WORLD_MAX_ITEMS_PER_CLASS = {
            asteroid: 0,
            drone : 1,
            ship : 0
        };
        
        Settings.KEY_BINDINGS_PLAYER1      = {
            left: Key.ARROW_LEFT,
            right: Key.ARROW_RIGHT,
            up: Key.ARROW_UP,
            fire: Key.SPACE
        };
        
        Settings.KEY_BINDINGS_PLAYER2      = {
            left: Key.A,
            right: Key.D,
            up: Key.W,
            fire: Key.G
        };

        asteroids.Arrow = function(x, y, scale) {

            var self = this;

            x = x || 0;

            y = y || 0;

            this.scale = scale || 1;

            this.strokeStyle = "#f00";

            this.world = null;

            this.id = "arrow";

            this.velocity = [0, 0];

            this.ACCELERATION = 0.05;

            this.MAX_VELOCITY = 7;

            var points = {
                top: [x, y - (self.scale * 25)],

                topLeft: [x - 10, y - (self.scale * 10)],
                topRight: [x + 10, y - (self.scale * 10)],

                bottom: [x, y + (self.scale * 25)],

                pivot: [x, y]
            };

            this.width = VectorMath.distance(points.top, points.bottom);

            this.height = VectorMath.distance(points.topLeft, points.topRight);

            this.getDirection = function() {
                return VectorMath.normalize(VectorMath.substract(points.top, points.pivot));
            }

            this.draw = function(ctx) {
                var p = points;

                ctx.moveTo(p.bottom[0], p.bottom[1]); // bottom
                ctx.lineTo(p.top[0], p.top[1]); // top
                ctx.lineTo(p.topLeft[0], p.topLeft[1]); // topLeft
                ctx.lineTo(p.topRight[0], p.topRight[1]); // topRight
                ctx.lineTo(p.top[0], p.top[1]); // top

                ctx.strokeStyle = self.strokeStyle;
                ctx.fillStyle = self.strokeStyle;
                ctx.stroke();
                ctx.fill();
            }

            this.rotate = function(angleDeg) {
                if ( !! !angleDeg) return;

                for (var i in points) {
                    if (i === "pivot") continue;

                    points[i] = VectorMath.rotate(points[i], angleDeg, [points.pivot[0], points.pivot[1]]);
                }
            }

            this.move = function() {
                if (self.velocity[0] === 0 && self.velocity[1] === 0) return;

                var velocity = self.velocity;
                var pivot = points.pivot;
                var offscreen = this.world.isOffscreen(pivot, self.width, self.height);

                if ( !! offscreen) {
                    this.world.debugText.values["Offscreen"] = "true";

                    var stageW = app.stage.width;
                    var stageH = app.stage.height;

                    if (VectorMath.equals(Direction.NORTH, offscreen)) {
                        self.moveTo(pivot[0], pivot[1] + stageW);
                    } else if (VectorMath.equals(Direction.SOUTH, offscreen)) {
                        self.moveTo(pivot[0], pivot[1] - stageW);
                    } else if (VectorMath.equals(Direction.WEST, offscreen)) {
                        self.moveTo(pivot[0] + stageH, pivot[1]);
                    } else if (VectorMath.equals(Direction.EAST, offscreen)) {
                        self.moveTo(pivot[0] - stageH, pivot[1]);
                    } else {
                        self.moveTo(400, 400);
                    }

                } else {
                    this.world.debugText.values["Offscreen"] = "false";
                }

                for (var i in points) {
                    points[i] = VectorMath.add(points[i], velocity);
                }
            }

            this.moveTo = function(x, y) {
                if (VectorMath.equals(points.pivot, [x, y])) return;

                var moveTo = VectorMath.substract([x, y], points.pivot);

                for (var i in points) {
                    points[i] = VectorMath.add(points[i], moveTo);
                }
            }

            this.accelerate = function() {
                self.velocity = VectorMath.add(self.velocity, VectorMath.multiply(self.getDirection(), self.ACCELERATION));

                // max velocity
                var vsize = VectorMath.size(self.velocity);

                if (vsize > self.MAX_VELOCITY) {
                    self.velocity = VectorMath.multiply(VectorMath.normalize(self.velocity), self.MAX_VELOCITY);
                }

                if (vsize < -self.MAX_VELOCITY) {
                    self.velocity = VectorMath.multiply(VectorMath.normalize(self.velocity), -self.MAX_VELOCITY);
                }
            }

            this.update = function() {
                // key binds
                if ( !! self.world.keyPressed[Key.ARROW_LEFT]) self.rotate(-5);
                if ( !! self.world.keyPressed[Key.ARROW_RIGHT]) self.rotate(+5);
                if ( !! self.world.keyPressed[Key.ARROW_UP]) self.accelerate();
                // update
                this.move();
            }
        }

        var DebugText = asteroids.DebugText = function() {
            var self = this;

            this.id = "debugText";

            this.fontSize = 12;

            this.visible = true;

            this.values = {

                toArray: function() {

                    var self = this;
                    var ret = [];

                    for (var i in self) {
                        if (typeof self[i] === "function") continue;

                        ret.push(i + " : '" + self[i] + "'");
                    }

                    return ret;
                }
            };

            this.draw = function(ctx) {
                ctx.font = this.fontSize + "px monospace";
                ctx.fillStyle = "#0f0";

                var rows = self.values.toArray();
                for (var i in rows) {
                    ctx.fillText(rows[i], 10, 10 + this.fontSize * ((i * 1) + 1));
                }
            }

        }

        var PerkType = asteroids.PerkType = function() {}

        PerkType.FIRE_RATE = 0; // enhance ship's cannon fire rate
        PerkType.DOUBLE_DAMAGE = 1; // more damage, more funn
        PerkType.MORE_CANNONS = 2; // fire in more directions ... after all, you are surrounded ;)

        var Perk = asteroids.Perk = function(x, y, type) {

            var self = this;

            var scale = 1;

            this.class = "perk";

            this.type = type = type || Math.randomInt(0, Object.keys(PerkType).length - 1);

            var lifespan = Math.randomInt(Settings.PERK_LIFESPAN[0], Settings.PERK_LIFESPAN[1]);

            this.world = null;

            this.alive = true;

            this.points = new Points({
                pivot: [x, y],
                top: [x, y - 7 * scale],
                left: [x - 4 * scale, y + 4 * scale],
                right: [x + 4 * scale, y + 4 * scale]
            });

            this.points2 = new Points({
                pivot: [x, y],
                top: [x, y + 7 * scale],
                left: [x - 4 * scale, y - 4 * scale],
                right: [x + 4 * scale, y - 4 * scale]
            });

            this.init = function() {
                self.world.clock.registerLock([this.id, 'perk_countdown'], 1000);
            }

            this.update = function() {
                self.points.rotate(+3);
                self.points2.rotate(-3);

                if (!self.world.clock.isLocked([this.id, 'perk_countdown'])) {
                    --lifespan;
                }

                if (lifespan < 1) {
                    self.alive = false;
                }
            }

            this.draw = function(ctx) {

                var p = self.points.getPoints();
                var p2 = self.points2.getPoints();

                decorate(ctx);

                ctx.moveTo(p.top[0], p.top[1]);

                ctx.lineTo(p.left[0], p.left[1]);
                ctx.lineTo(p.right[0], p.right[1]);
                ctx.lineTo(p.top[0], p.top[1]);

                ctx.moveTo(p2.top[0], p2.top[1]);

                ctx.lineTo(p2.left[0], p2.left[1]);
                ctx.lineTo(p2.right[0], p2.right[1]);
                ctx.lineTo(p2.top[0], p2.top[1]);

                ctx.stroke();
            }

            var decorate = function(ctx) {
                switch (type) {
                    case PerkType.FIRE_RATE:
                        ctx.strokeStyle = "#ff0";
                        break;
                    case PerkType.DOUBLE_DAMAGE:
                        ctx.strokeStyle = "#0ff";
                        break;
                    case PerkType.MORE_CANNONS:
                        ctx.strokeStyle = "#f0f";
                        break;
                }
            }
        }

        var Ship = asteroids.Ship = function(x, y, scale, keyBindings) {

            // var self = this;

            scale = scale || 1;

            this.world = null;

            this.velocity = [0, 0];

            this.ACCELERATION = 0.05;

            this.MAX_VELOCITY = 7;

            var MIN_FIRE_RATE = Settings.SHIP_FIRE_RATE[0] || 100; // 1 projectile per xxx milisec

            var MAX_FIRE_RATE = Settings.SHIP_FIRE_RATE[1] || 300; // 1 projectile per xxx milisec

            var fireActionLock = 0;

            this.id = "ship";

            this.class = "ship";

            this.perksManagement = null;

            this.points = new Points({
                pivot: [x, y],

                top: [x, y - (10 * scale)],
                left: [x - (5 * scale), y + (10 * scale)],
                right: [x + (5 * scale), y + (10 * scale)],

                bottom: [x, y + (10 * scale)]
            });

            this.width = VectorMath.distance(this.points.getPoint("top"), this.points.getPoint("bottom"));

            this.height = VectorMath.distance(this.points.getPoint("left"), this.points.getPoint("right"));

            this.init = function() {
                this.perksManagement = new PerksManagement(this.world);

                this.world.clock.registerLock([this.id, 'fire_rate_lock'], MAX_FIRE_RATE);
            }

            this.update = function() {
                // key bindings
                if ( !! this.world.keyPressed[keyBindings.left]) this.points.rotate(-5);
                if ( !! this.world.keyPressed[keyBindings.right]) this.points.rotate(+5);
                if ( !! this.world.keyPressed[keyBindings.up]) this.accelerate();
                if ( !! this.world.keyPressed[keyBindings.fire]) this.fire();

                // actions
                this.move();
            }

            this.move = function() {
                var w = this.world;

                var offscreen = w.isOffscreen(this.points.getPoint('pivot'), this.width, this.height);
                if (offscreen) {
                    this.points.resetPositionInRectangle(offscreen, w.stage.width, w.stage.height);
                }

                this.points.move(this.velocity);

                this.collide();
            }

            this.fire = function() {
                var now = new Date().getTime();

                if(this.world.clock.isLocked([this.id, 'fire_rate_lock'])) return; // reloading or shit ...
                // if (now < fireActionLock) return; // reloading or shit ...

                var pivot = VectorMath.add(this.points.getPoint("top"), VectorMath.multiply(this.points.getDirection(), 5));

                var velocity = VectorMath.multiply(this.points.getDirection(), this.MAX_VELOCITY + 0.5);
                velocity = VectorMath.add(this.velocity, velocity);

                var doubleDamage = this.perksManagement.isActive(PerkType.DOUBLE_DAMAGE);

                this.world.addItem(new Projectile(pivot, velocity, null, doubleDamage, this.id));

                // TODO : multiple cannon fire is not olrajt yet ... [ in progress ]
                if (this.perksManagement.isActive(PerkType.MORE_CANNONS) || Settings.SHIP_CANNONS_LEVEL > 0) {
                    var cannonsLevelByPerk = this.perksManagement.getPerkMagnitude(PerkType.MORE_CANNONS);

                    var cannonsLevel = Settings.SHIP_CANNONS_LEVEL > cannonsLevelByPerk ? Settings.SHIP_CANNONS_LEVEL : cannonsLevelByPerk;

                    if (cannonsLevel > 0) { // add back cannon
                        this.world.addItem(new Projectile(pivot, VectorMath.add(this.velocity, VectorMath.rotate(velocity, 180)), null, doubleDamage, this.id));
                    }
                    if (cannonsLevel > 1) { // add west/east cannons
                        this.world.addItem(new Projectile(pivot, VectorMath.add(this.velocity, VectorMath.rotate(velocity, 90)), null, doubleDamage, this.id));
                        this.world.addItem(new Projectile(pivot, VectorMath.rotate(velocity, -90), null, doubleDamage));
                    }
                    if (cannonsLevel > 2) { // add even moar cannons (north-west, south-east etc.)
                        this.world.addItem(new Projectile(pivot, VectorMath.add(this.velocity, VectorMath.rotate(velocity, 45)), null, doubleDamage, this.id));
                        this.world.addItem(new Projectile(pivot, VectorMath.add(this.velocity, VectorMath.rotate(velocity, -45)), null, doubleDamage, this.id));
                        this.world.addItem(new Projectile(pivot, VectorMath.add(this.velocity, VectorMath.rotate(velocity, 135)), null, doubleDamage, this.id));
                        this.world.addItem(new Projectile(pivot, VectorMath.add(this.velocity, VectorMath.rotate(velocity, -135)), null, doubleDamage, this.id));
                    }
                }

                var currentFireRate = MAX_FIRE_RATE;
                if (this.perksManagement.isActive(PerkType.FIRE_RATE)) {
                    var magnitude = this.perksManagement.getPerkMagnitude(PerkType.FIRE_RATE);

                    var bonus = ((MAX_FIRE_RATE - MIN_FIRE_RATE) / this.perksManagement.MAX_MAGNITUDE) * magnitude;

                    currentFireRate -= bonus;
                    if (currentFireRate < 100) currentFireRate = 100;
                }

                this.world.clock.setDuration(this.id + ".fire_rate_lock", currentFireRate);
            }

            this.draw = function(ctx) {
                var p = this.points.getPoints();

                ctx.strokeStyle = this.strokeStyle || "#fff";
                ctx.fillStyle = this.fillStyle || "#fff";

                ctx.moveTo(p.top[0], p.top[1]);
                ctx.lineTo(p.left[0], p.left[1]);
                ctx.lineTo(p.pivot[0], p.pivot[1]);
                ctx.lineTo(p.right[0], p.right[1]);
                ctx.lineTo(p.top[0], p.top[1]);

                ctx.stroke();
                ctx.fill();
            }

            this.accelerate = function(multiply, computeOnly) {
                multiply = multiply || 1; 

                if(computeOnly) {
                    var oldVelocity = this.velocity;
                }

                this.velocity = VectorMath.add(this.velocity, VectorMath.multiply(this.points.getDirection(), this.ACCELERATION * multiply));

                // max velocity
                var vsize = VectorMath.size(this.velocity);

                if (vsize > this.MAX_VELOCITY) {
                    this.velocity = VectorMath.multiply(VectorMath.normalize(this.velocity), this.MAX_VELOCITY);
                }

                if (vsize < -this.MAX_VELOCITY) {
                    this.velocity = VectorMath.multiply(VectorMath.normalize(this.velocity), -this.MAX_VELOCITY);
                }

                if(computeOnly) {
                    var computedVelocity = this.velocity;
                    this.velocity = oldVelocity;
                    return computedVelocity;
                }
            }

            this.collide = function() {

                if (Settings.SHIP_IMMORTAL) {
                    return;
                }

                var asteroids = this.world.getItemsByClass('asteroid');

                for (var i in asteroids) {
                    if (Collisions.circleCollision(this, asteroids[i])) {
                        this.alive = false;
                        break;
                    }
                }

                var perks = this.world.getItemsByClass('perk');

                for (var i in perks) {
                    if (Collisions.circleCollision(this, perks[i])) {
                        this.perksManagement.addPerk(perks[i]);
                        perks[i].alive = false;
                    }
                }
            }
        }

        var Projectile = asteroids.Projectile = function(pivot, velocity, scale, doubleDamage, firedFromId) {

            var self = this;

            this.alive = true;

            scale = scale || 4;

            this.world = null;

            var x = pivot[0];
            var y = pivot[1];

            doubleDamage = doubleDamage || false;

            this.points = new Points({
                pivot: [x, y],
                top: [x, y + (-1 * scale)],
                bottom: [x, y + (1 * scale)],
                left: [x + (-1 * scale), y],
                right: [x + (+1 * scale), y]
            });

            this.width = VectorMath.distance(this.points.getPoint("top"), this.points.getPoint("bottom"));

            this.height = VectorMath.distance(this.points.getPoint("left"), this.points.getPoint("right"));

            this.update = function() {
                self.points.rotate(5);
                self.points.move(velocity);
                self.collide();

                if (self.world.isOffscreen(self.points.getPoint("pivot"), self.width, self.height)) {
                    self.alive = false;
                }
            }

            this.draw = function(ctx) {
                var p = this.points.getPoints();

                ctx.strokeStyle = doubleDamage ? "#0ff" : "#f00";

                ctx.moveTo(p.top[0], p.top[1]);
                ctx.lineTo(p.bottom[0], p.bottom[1]);
                ctx.lineTo(p.left[0], p.left[1]);
                ctx.lineTo(p.right[0], p.right[1]);
                ctx.lineTo(p.top[0], p.top[1]);

                ctx.stroke();

            }

            this.collide = function() {

                var pivot = self.points.getPoint('pivot');
                var radius = self.width > self.height ? self.width : self.height; // bigger is better

                var asteroids = self.world.getItemsByClass("asteroid");
                for (var i in asteroids) {
                    if (Collisions.circleCollision(self, asteroids[i]) === CollisionType.INNER) {
                        self.alive = false;

                        asteroids[i].hit();
                        if (doubleDamage) {
                            asteroids[i].hit();
                        }

                        break;
                    }
                }

                var perks = self.world.getItemsByClass("perk");
                for (var i in perks) {
                    if (Collisions.circleCollision(self, perks[i]) === CollisionType.INNER) {
                        perks[i].alive = false;
                        var ship = self.world.getItem(firedFromId);
                        if (ship) {
                            ship.perksManagement.addPerk(perks[i].type);
                        }
                        break;
                    }
                }
            }
        }

        var Asteroid = asteroids.Asteroid = function(pivot, velocity, rotateAngleDeg, scale, nodes) {

            var MINIMUM_SCALE = 0.20;

            var MAX_HP = 8;

            var self = this;

            this.scale = scale || 1;

            var pointsOrder = [];

            this.world = null;

            this.alive = true;

            this.class = "asteroid";

            this.hp = Math.round(scale * MAX_HP);
            if (this.hp > MAX_HP) this.hp = MAX_HP;

            var generatePoints = function(x, y, scale, nodes) {

                nodes = nodes || Math.randomInt(5, 9);

                var point = VectorMath.add([x, y], VectorMath.multiply(Direction.NORTH, (Math.randomInt(20, 80) * scale)));

                var points = new Points({
                    pivot: [x, y],
                    top: point
                });

                var angleArea = 360 / nodes;

                for (var i = 0; i < nodes; i++) {
                    var angleDeg = Math.randomInt(i * angleArea, (i + 1) * angleArea);

                    point = VectorMath.rotate(points.getPoint('top'), angleDeg, [x, y]);

                    points.add(point, "point_" + i);
                    pointsOrder.push("point_" + i);
                }

                return points;
            }

            var points = generatePoints(pivot[0], pivot[1], scale, nodes);

            this.points = points;

            var size = VectorMath.distance(points.getPoint('pivot'), points.getPoint('top')) * 2;

            this.draw = function(ctx) {
                var p = points.getPoints();
                var pivot = points.getPoint('pivot');
                var first = true;
                var firstPoint = [];
                for (var i in pointsOrder) {
                    if (i === 'pivot') continue;

                    if (first) {
                        ctx.moveTo(p[pointsOrder[i]][0], p[pointsOrder[i]][1]);
                        firstPoint = [p[pointsOrder[i]][0], p[pointsOrder[i]][1]];
                        first = false;
                    } else {
                        ctx.lineTo(p[pointsOrder[i]][0], p[pointsOrder[i]][1]);
                    }
                }
                ctx.lineTo(firstPoint[0], firstPoint[1]);

                ctx.strokeStyle = "#fff";
                ctx.stroke();

                ctx.closePath();
                ctx.save();

                ctx.beginPath();
                ctx.restore();

                // life bar :)

                if (self.hp > 5) {
                    ctx.fillStyle = "#0f0";
                } else if (self.hp > 2) {
                    ctx.fillStyle = "#ff0";
                } else {
                    ctx.fillStyle = "#f00";
                }

                ctx.rect(pivot[0], pivot[1], 5 * self.hp, 3);
                ctx.fill();
            }

            this.update = function() {
                points.rotate(rotateAngleDeg);
                points.move(velocity);

                if (self.world.isOffscreen(points.getPoint('pivot'), size + 50)) {
                    this.alive = false;
                }
            }

            // asteroid was hit by something 
            this.hit = function() {
                --self.hp;

                if (self.hp <= 0) {
                    self.alive = false;
                    this.world.game.score += Math.round(self.scale * 10) * 10;
                    // this.world.game.score += 10;
                }
            }
        }

        var PerksManagement = asteroids.PerksManagement = function(world) {

            var MAX_MAGNITUDE = 4;
            this.MAX_MAGNITUDE = MAX_MAGNITUDE;

            var self = this;

            this.world = world;

            // one perk duration in sec.
            var perkDurations = {};
            perkDurations[PerkType.FIRE_RATE] = 15;
            perkDurations[PerkType.DOUBLE_DAMAGE] = 15;
            perkDurations[PerkType.MORE_CANNONS] = 15;

            // perks validity
            var validUntil = {};
            validUntil[PerkType.FIRE_RATE] = 15;
            validUntil[PerkType.DOUBLE_DAMAGE] = 15;
            validUntil[PerkType.MORE_CANNONS] = 15;

            this.addPerk = function(perkType) {
                if (typeof perkType === "object") {
                    if (perkType.type) {
                        perkType = perkType.type;
                    }
                }

                if (self.getPerkMagnitude(perkType) >= MAX_MAGNITUDE) {
                    return;
                }

                var perkMagnitude = self.getPerkMagnitude(perkType) + 1;

                validUntil[perkType] = world.clock.now + perkDurations[perkType] * 1000 * perkMagnitude;
            }

            this.isActive = function(perkType) {
                // if (typeof perkType !== "number") return;

                return Date.now() < validUntil[perkType];
            }

            this.getPerkMagnitude = function(perkType) {
                var diff = Math.round((validUntil[perkType] - Date.now()) / 1000); // diff in sec

                if (diff <= 0) return 0;

                return Math.round(diff / perkDurations[perkType]);
            }

        }

        var GameState = asteroids.GameState = function() {};

        GameState.START = 0;
        GameState.IN_PROGRESS = 1;
        GameState.END = 2;

        var Game = asteroids.Game = function() {

            this.score = 0;

            var self = this;

            this.state = GameState.START;

            // init

            var stage = getStage(document.body.clientWidth, document.body.clientHeight);

            var app = new App(stage);

            this.app = app; // debug purpose only

            var generateAsteroidsLock = 0;

            var generateAsteroidsRate = Settings.GENERATE_ASTEROIDS_RATE[1]; // in milis

            this.update = function() {
                switch (self.state) {
                    case GameState.START:
                        onStart();
                        break;
                    case GameState.IN_PROGRESS:
                        onProgress();
                        break;
                    case GameState.END:
                        onEnd();
                        break;

                    default:
                        throw "Invalid game state. [ state = '" + self.state + "']";
                }

                app.world.debugText.values['score'] = this.score;
            }

            var onStart = function() {
                app.world.nuke();

                app.world.addItem(new Ship(stage.width / 2, stage.height / 2, null, Settings.KEY_BINDINGS_PLAYER1));

                var diff = 100;

                var d1 = new Drone(stage.width / 2 + diff, stage.height / 2, "#00f");
                var d2 = new Drone(stage.width / 2 - diff, stage.height / 2, "#00f");
                var d3 = new Drone(stage.width / 2, stage.height / 2 + diff, "#00f");
                var d4 = new Drone(stage.width / 2, stage.height / 2 - diff, "#00f");

                //d1.velocity = Direction.NORTH;
                //d2.velocity = Direction.SOUTH;
                //d3.velocity = Direction.WEST;
                //d4.velocity = Direction.EAST;

                app.world.addItem(d1, 'drone1');
                app.world.addItem(d2, 'drone2');
                app.world.addItem(d3, 'drone3');
                app.world.addItem(d4, 'drone4');
                
                if (Settings.MULTIPLAYER) {
                    app.world.addItem(new Ship(stage.width / 2 - 50, stage.height / 2, null, Settings.KEY_BINDINGS_PLAYER2), 'ship2');
                }

                app.animate();

                self.state = GameState.IN_PROGRESS;

                app.world.game = self; // for update callback (in prototype3 hierarchy app <-> world <-> game must be modified)

                this.score = 0;

                // register locks
                app.world.clock.registerLock('create_perk_attempt', 1000);
            }

            var onProgress = function() {
                var clock = app.world.clock;

                if (clock.now > generateAsteroidsLock) {
                    generateAsteroid(stage);
                    generateAsteroidsLock = clock.now + generateAsteroidsRate;

                    generateAsteroidsRate = Math.randomInt(Settings.GENERATE_ASTEROIDS_RATE[0], Settings.GENERATE_ASTEROIDS_RATE[1]);
                }

                if (!clock.isLocked('create_perk_attempt')) {
                    generatePerkAttempt();
                }

                if (app.world.countItemsByClass('ship') === 0 && Settings.ALLOW_ENDGAME) {
                    self.state = GameState.END;
                }

                stage.onclick = function(ev) {
                    app.world.getItem('drone1').addFlightTarget([ev.clientX, ev.clientY]);
                    app.world.addItem(new Perk(ev.clientX, ev.clientY));
                }

                stage.ondblclick = function(ev) {
                    app.world.getItem('drone1').currentFlightMode = 3;
                }

            }

            var onEnd = function() {
                app.world.debugText.values["game.state"] = "GAME OVER (mouse click or F5 for new game ...)";

                // restart game with mouse click
                stage.onclick = function(ev) {
                    location.reload();
                }
            }

                function getStage(w, h, bg) {
                    var stage = document.createElement("canvas");
                    stage.width = w || 800;
                    stage.height = h || 800;
                    stage.id = "stage";
                    stage.style.background = bg || "#000";

                    document.body.appendChild(stage);

                    return stage;
                }

            var generateAsteroids = function(stage, count) {
                for (var i = 0; i < count; i++) {
                    generateAsteroid(stage);
                }
            }

            var generateAsteroid = function(stage) {

                if (!Settings.GENERATE_ASTEROIDS) return;

                var sW = stage.width;
                var sH = stage.height;

                var targetPoint = [Math.randomInt(sW / 2 - Math.round(sW * 0.2), sW / 2 + Math.round(sW * 0.2)), Math.randomInt(sH / 2 - Math.round(sH * 0.2), sH / 2 + Math.round(sH * 0.2))];
                var pointOfOrigin = [Math.randomInt(0, sW), Math.randomInt(0, sH)];

                // start from edge
                switch (Math.randomInt(0, 3)) {
                    case 0:
                        pointOfOrigin = [-50, pointOfOrigin[1]];
                        break;
                    case 1:
                        pointOfOrigin = [sW + 50, pointOfOrigin[1]];
                        break;
                    case 2:
                        pointOfOrigin = [pointOfOrigin[0], -50];
                        break;
                    case 3:
                        pointOfOrigin = [pointOfOrigin[0], sH + 50];
                        break;
                }

                var velocitySize = Math.randomFloat(0.20, 2, 2);
                var velocity = VectorMath.multiply(VectorMath.normalize(VectorMath.substract(targetPoint, pointOfOrigin)), velocitySize);

                var scale = Math.randomFloat(0.20, 1, 2);

                var rotateAngleDeg = Math.randomFloat(-0.50, 0.50, 2);

                app.world.addItem(new Asteroid(pointOfOrigin, velocity, rotateAngleDeg, scale));
            }

            var generatePerkAttempt = function() {

                if (!Settings.GENERATE_PERKS) return;

                if (Math.randomInt(1, 5) <= 3) return; // 40% chance of perk creation (+- I do not know the exact theory behing js random method)

                var padding = 20;
                var x = Math.randomInt(padding, stage.width - padding);
                var y = Math.randomInt(padding, stage.height - padding);

                app.world.addItem(new Perk(x, y));

            }

            onStart();
        }

        var Fps = asteroids.Fps = function(clock) {

            var fpsCurrent = 0;

            var fpsLast = 0;

            var currentSecond = 0;

            this.update = function() {

                if ((clock.now - currentSecond) > 1000) {
                    currentSecond = clock.now; // update sec
                    fpsLast = fpsCurrent;
                    fpsCurrent = 0;
                } else {
                    fpsCurrent++;
                }
            }

            this.getFps = function() {
                return fpsLast !== 0 ? fpsLast : fpsCurrent;
            }

        }

        var World = asteroids.World = function(stage) {

            var self = this;

            this.debugText = new DebugText();
            this.debugText.fontSize = 16;

            var items = {};

            var itemsByClass = {};

            this.stage = stage;

            this.keyPressed = [];

            var idcounter = 0;

            this.game = null;

            this.clock = new Clock();

            if (Settings.SHOW_FPS) {
                this.fps = new Fps(this.clock);
            }

            document.body.onkeydown = function(ev) {
                self.keyPressed[ev.keyCode] = true;
            }

            document.body.onkeyup = function(ev) {
                self.keyPressed[ev.keyCode] = false;
            }

            this.nuke = function() {
                items = {};
                self.addItem(this.debugText, "debugText"); // this must be always present for obvious reasons
            }

            this.getItems = function() {
                return items;
            }

            this.getItemsByClass = function(className) {
                return itemsByClass[className] ? itemsByClass[className] : {};
            }

            this.countItemsByClass = function(className) {
                if (!itemsByClass[className]) {
                    return 0;
                } else {
                    return Object.keys(itemsByClass[className]).length;
                }
            }

            this.getItem = function(id) {
                return items[id];
            }

            this.addItems = function(items) {
                for (var i in items) {
                    self.addItem(items[i]);
                }
            }

            this.addItem = function(obj, id) {
                if (!id) {
                    if (obj.id) {
                        id = obj.id;
                    } else {
                        id = "undefined_" + (++idcounter); // generate id	
                    }
                }

                obj.id = id;

                if (!obj.class) {
                    obj.class = "unknown";
                }

                if (typeof Settings.WORLD_MAX_ITEMS_PER_CLASS[obj.class] === 'number' && this.countItemsByClass(obj.class) === Settings.WORLD_MAX_ITEMS_PER_CLASS[obj.class]) {
                    return;
                }

                if (!obj.hasOwnProperty("alive") || typeof obj.alive !== 'boolean') obj.alive = true;

                if (obj.hasOwnProperty("world")) obj.world = self; // inject world instance if requested

                if (items[obj.id]) {
                    throw "Item with id '" + obj.id + "' already exists in this world.";
                }

                items[obj.id] = obj;

                if (!itemsByClass[obj.class]) {
                    itemsByClass[obj.class] = {};
                }

                itemsByClass[obj.class][obj.id] = obj;

                if (typeof obj.init === 'function') {
                    obj.init();
                }
            }

            this.update = function() {

                self.clock.update();
                if (self.fps) self.fps.update();

                if (self.game && self.game.update) {
                    self.game.update();
                }

                var i;

                for (i in items) {
                    if (items[i].hasOwnProperty("alive") && !items[i].alive) {
                        delete itemsByClass[items[i].class][i];
                        delete items[i];
                        continue;
                    }

                    if (items[i].update) items[i].update();
                }

                // debug
                if (self.fps) self.debugText.values['fps'] = self.fps.getFps();

                self.debugText.values['asteroids count'] = self.countItemsByClass('asteroid');
            }

            this.draw = function(ctx) {
                var i;

                ctx.clearRect(0, 0, self.stage.width, self.stage.height);

                for (i in items) {

                    if (items[i].visible === false) continue;

                    ctx.save();
                    ctx.beginPath();

                    items[i].draw(ctx);

                    ctx.closePath();
                    ctx.restore();
                }
            }

            this.isOffscreen = function(pivot, w, h) {
                var x = pivot[0];
                var y = pivot[1];

                h = h || w;

                var margin = w > h ? w : h;

                var stageW = self.stage.width;
                var stageH = self.stage.height;

                if (x < -margin) return Direction.WEST;
                if (y < -margin) return Direction.NORTH;
                if (x > stageW + margin) return Direction.EAST;
                if (y > stageH + margin) return Direction.SOUTH;

                return false;
            }


            self.addItem(this.debugText, "debugText");
        }

        var App = asteroids.App = function(stage) {

            var self = this; // dzavaskript, you fuck !

            var animationId = null;

            this.stage = stage;

            this.ctx = stage.getContext("2d");

            this.world = new World(stage);

            var getAnimationFrame = (function() {
                return window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame ||
                    function( /* function */ callback, /* DOMElement */ element) {
                        window.setTimeout(callback, 1000 / 60);
                };
            })();

            this.animate = function() {
                try {
                    animationId = getAnimationFrame(self.animate);

                    self.world.update();
                    self.world.draw(self.ctx);

                } catch (e) {
                    alert(e);
                    console.log(e);
                    self.terminate();
                }
            }

            this.terminate = function() {
                window.cancelAnimationFrame(animationId);
                animationId = null;
            }

        }

        var Angle = asteroids.Angle = function() {}

        asteroids.Angle.toDeg = function(rad) {
            return rad * (180 / Math.PI);
        }

        asteroids.Angle.toRad = function(deg) {
            return deg * (Math.PI / 180);
        }

        var VectorMath = asteroids.VectorMath = function() {}

        asteroids.VectorMath.add = function(vect1, vect2) {
            if (typeof vect2 === "number") vect2 = [vect2, vect2];
            return [vect1[0] + vect2[0], vect1[1] + vect2[1]];
        }

        asteroids.VectorMath.substract = function(vect1, vect2) {
            if (typeof vect2 === "number") vect2 = [vect2, vect2];
            return [vect1[0] - vect2[0], vect1[1] - vect2[1]];
        }

        asteroids.VectorMath.multiply = function(vect1, vect2) {
            if (typeof vect2 === "number") vect2 = [vect2, vect2];
            return [vect1[0] * vect2[0], vect1[1] * vect2[1]];
        }

        asteroids.VectorMath.size = function(vect1) {
            return VectorMath.distance(vect1, [0, 0]);
        }

        // return 1 for first is bigger, -1 for second is bigger, 0 for equality
        asteroids.VectorMath.compareSize = function(vect1, vect2) {
            var size1 = VectorMath.size(vect1);
            var size2 = VectorMath.size(vect2);

            if(size1 > size2) {
                return 1;
            }

            if(size2 > size1) {
                return -1;
            }

            return 0;
        }

        asteroids.VectorMath.distance = function(vect1, vect2) {
            var a = Math.abs(vect1[0] - vect2[0]);
            var b = Math.abs(vect1[1] - vect2[1]);

            return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        }

        asteroids.VectorMath.normalize = function(vect) {
            var length = VectorMath.size(vect);
            return [vect[0] / length, vect[1] / length];
        }

        asteroids.VectorMath.dotProduct = function(vect1, vect2) {
            return (vect1[0] * vect2[0]) + (vect1[1] * vect2[1]);
        }

        asteroids.VectorMath.angleBetween = function(vect1, vect2) {
            var perpDot = vect1[0] * vect2[1] - vect1[1] * vect2[0]; // TODO : find out more about this, source: http://flaviusalecu.com/post/1071220798
            return Math.atan2(perpDot, VectorMath.dotProduct(vect1, vect2));
        }

        asteroids.VectorMath.rotate = function(vect, angleDeg, pivot) {
            var angleRad = Angle.toRad(angleDeg || 0);
            pivot = pivot || [0, 0];

            var cs = Math.cos(angleRad);
            var sn = Math.sin(angleRad);

            var x = (vect[0] - pivot[0]) * cs - (vect[1] - pivot[1]) * sn + pivot[0];
            var y = (vect[0] - pivot[0]) * sn + (vect[1] - pivot[1]) * cs + pivot[1];

            return [x, y];
        }

        asteroids.VectorMath.inverse = function(vect) {
            return [vect[0] * -1, vect[1] * -1];
        }

        asteroids.VectorMath.equals = function(vect1, vect2) {
            return vect1[0] === vect2[0] && vect1[1] === vect2[1];
        }

        var Points = asteroids.Points = function(points) {

            var self = this;

            if (typeof points.pivot === "undefined" || typeof points.top === "undefined") {
                throw "Illegal 'Points' definition. Properties points.pivot and points.top must exists.";
            }

            this.getRadius = function() {
                return VectorMath.distance(points.pivot, points.top);
            }

            this.add = function(point, id) {
                id = id || "point_" + Object.keys(points).length;

                points[id] = point;
            }

            this.getPoint = function(index) {
                if (points[index]) {
                    return points[index];
                }

                throw "No point with index '" + index + "'.";
            }

            this.getPoints = function() {
                return points;
            }

            this.rotate = function(angleDeg) {

                if ( !! !angleDeg) return; // starting to think in javascript ... nah, I just put this here for funn xD

                for (var i in points) {
                    if (i === "pivot") continue;

                    points[i] = VectorMath.rotate(points[i], angleDeg, [points.pivot[0], points.pivot[1]]);
                }
            }

            this.getAngleBetween = function(pointId, targetPoint) {
                if(!pointId || pointId === 'pivot' || !points[pointId]) {
                    throw "Illegal pointId. PointID must be defined, must exists within points field and can not be pivot. [ pointId = '"+pointId+"']";
                }

                var targetDirection = VectorMath.normalize(VectorMath.substract(targetPoint, points.pivot));
                var orientationBySpecifiedPoint = VectorMath.normalize(VectorMath.substract(points[pointId], points.pivot));

                var angleBetween = Angle.toDeg(VectorMath.angleBetween(targetDirection, orientationBySpecifiedPoint));

                return angleBetween;
            }

            this.move = function(velocity) {
                if (velocity[0] === 0 && velocity[1] === 0) return;

                var pivot = points.pivot;

                for (var i in points) {
                    points[i] = VectorMath.add(points[i], velocity);
                }
            }

            this.moveTo = function(x, y) {
                if (VectorMath.equals(points.pivot, [x, y])) return;

                var moveTo = VectorMath.substract([x, y], points.pivot);

                for (var i in points) {
                    points[i] = VectorMath.add(points[i], moveTo);
                }
            }

            this.getDirection = function() {
                return VectorMath.normalize(VectorMath.substract(points.top, points.pivot));
            }

            this.resetPositionInRectangle = function(offsetPosition, rectW, rectH) {

                var pivot = points.pivot;

                if (VectorMath.equals(Direction.NORTH, offsetPosition)) {
                    self.moveTo(pivot[0], pivot[1] + rectH);
                } else if (VectorMath.equals(Direction.SOUTH, offsetPosition)) {
                    self.moveTo(pivot[0], pivot[1] - rectH);
                } else if (VectorMath.equals(Direction.WEST, offsetPosition)) {
                    self.moveTo(pivot[0] + rectW, pivot[1]);
                } else if (VectorMath.equals(Direction.EAST, offsetPosition)) {
                    self.moveTo(pivot[0] - rectW, pivot[1]);
                } else {
                    self.moveTo(rectW, rectH);
                }

            }

        }

        var Clock = function() {

            var self = this;

            this.now = Date.now();

            var timelocks = {};

            this.update = function() {
                this.now = Date.now();
            }

            // id can be string or array (order matters ofc)
            // duration in milis
            this.registerLock = function(id, duration) {
                timelocks[id] = {
                    'duration': duration,
                    'lock': 0
                };
            }

            this.setDuration = function(id, duration) {
                if(!timelocks[id]) {
                    this.registerLock(id, duration);
                    return;
                }

                timelocks[id].duration = duration;
            }

            this.isLocked = function(id) {
                if ( !! !timelocks[id]) throw "There is no such lock registered. [ lockId = '" + id + "' ]";

                if (timelocks[id].lock > self.now) {
                    return true;
                } else {
                    timelocks[id].lock = self.now + timelocks[id].duration;
                    return false;
                }
            }

        }

        var CollisionType = asteroids.CollisionType = function() {}

        CollisionType.NONE = 0;
        CollisionType.TOUCH = 1;
        CollisionType.INNER = 2;

        var Collisions = asteroids.Collisions = function() {}

        asteroids.Collisions.circleCollision = function(obj1, obj2) {
            if (!obj1.points) throw "obj1 does not expose points field.";
            if (!obj2.points) throw "obj2 does not expose points field.";

            var pivot1 = obj1.points.getPoint('pivot');
            var pivot2 = obj2.points.getPoint('pivot');

            var rad1 = obj1.points.getRadius();
            var rad2 = obj2.points.getRadius();

            var radSum = rad1 + rad2;
            var distance = VectorMath.distance(pivot1, pivot2);

            if (radSum > distance) return CollisionType.INNER;
            if (radSum == distance) return CollisionType.TOUCH;

            return CollisionType.NONE;
        }

        var Drone = asteroids.Drone = function(x, y, strokeStyle) {

            // super methods
            this._init = this.init;

            scale = 1;

            this.points = new Points({
                pivot: [x, y],

                top: [x, y - (10 * scale)],
                left: [x - (5 * scale), y + (10 * scale)],
                right: [x + (5 * scale), y + (10 * scale)],

                bottom: [x, y + (10 * scale)]
            });

            this.id = "drone";

            this.class = "drone";

            this.strokeStyle = strokeStyle || "#f00";

            this.fillStyle = strokeStyle || "#f00";

            this.world = null;

            this.lockedTarget = null;

            this.lockedFlightTarget = null;

            var flightTargetsStack = [];

            this.FLIGHT_MODE = {
                STAY_STILL: 0,
                ROTATE_TOWARDS_POINT: 1,
                FLY_TOWARDS_POINT: 2,
                DECELERATE: 3,
                EVASIVE_ACTION: 4
            };

            this.currentFlightMode = this.FLIGHT_MODE.STAY_STILL;

            this.velocity = [0,0];

            this.init = function() {
                this._init();
                
                this.world.clock.registerLock([this.id, 'reevaluate_target'], 500);
                this.world.clock.registerLock([this.id, 'reevaluate_flight_target'], 500);
            }

            this.estimateDecelerationPathSize = function() {
                var pathSize = 0;
                var speed = VectorMath.size(this.velocity);

                // rotation
                var diff = VectorMath.angleBetween(this.velocity, this.points.getDirection());
                pathSize += speed * (( 180 - Math.abs(Angle.toDeg(diff)) ) / 5);

                // deceleration
                while(speed > 0) {
                    pathSize += speed -= this.ACCELERATION; 
                } 

                return pathSize;
            }

            this.moveToFlightTarget = function() {

                switch(this.currentFlightMode) {

                    case this.FLIGHT_MODE.ROTATE_TOWARDS_POINT : {

                        if(this.rotateTowardsPoint(this.lockedFlightTarget)) {
                            this.currentFlightMode = this.FLIGHT_MODE.FLY_TOWARDS_POINT;    
                        }

                    }break;

                    case this.FLIGHT_MODE.FLY_TOWARDS_POINT : {
                        
                        var speed = VectorMath.size(this.velocity);

                        var direction = this.points.getDirection(); // normalized directional vector
                        var heading = VectorMath.normalize(this.velocity);

                        var angleBetween = Angle.toDeg(VectorMath.angleBetween(direction, heading));

                        if(!this.rotateTowardsPoint(this.lockedFlightTarget)) {
                            this.currentFlightMode = this.FLIGHT_MODE.ROTATE_TOWARDS_POINT;  
                            return;
                        }

                        this.accelerate();

                        var distance = VectorMath.distance(this.points.getPoint('pivot'), this.lockedFlightTarget);
                        this.world.debugText.values['distanceToTarget'] = distance;

                        if(distance < this.estimateDecelerationPathSize()) {
                            this.currentFlightMode = this.FLIGHT_MODE.DECELERATE;
                        }

                    }break;

                    case this.FLIGHT_MODE.DECELERATE : {

                        if(this.__cmdRotate === undefined) {
                            var diff = VectorMath.angleBetween(this.velocity, this.points.getDirection());
                            Math.randomInt(0,1) ?
                                this.rotate(- 180 + Math.abs(Angle.toDeg(diff))) :
                                this.rotate(180 - Math.abs(Angle.toDeg(diff)));
                            return;
                        }

                        if(!this.rotate()) {
                            return;
                        }

                        this.world.getItem('debugText').values['drone_velocity_size'] = VectorMath.size(this.velocity);

                        var nextVelocity = this.accelerate(1, true);
                        if(VectorMath.compareSize(nextVelocity, this.velocity) === -1) {
                            this.velocity = nextVelocity;
                            return;
                        }

                        if(VectorMath.size(this.velocity) > 0.03) {
                            this.__cmdRotate = undefined;
                            return;
                        }

                        this.currentFlightMode = this.FLIGHT_MODE.STAY_STILL;
                        this.rotateReset();
                        this.lockedFlightTarget = null;

                    }break;

                    case this.FLIGHT_MODE.EVASIVE_ACTION : {

                    }break;

                    default:
                    case this.FLIGHT_MODE.STAY_STILL : {
                        
                        if(flightTargetsStack.length > 0) {
                            this.lockedFlightTarget = flightTargetsStack.splice(0, 1)[0];
                        }

                        if(this.lockedFlightTarget) {
                            this.currentFlightMode = this.FLIGHT_MODE.ROTATE_TOWARDS_POINT;
                            return;
                        }

                        this.holdPost();
                    }break;
                }

            }

            this.addFlightTarget = function(target) {
                flightTargetsStack.push(target);
            }

            this.update = function() {
                
                this.moveToFlightTarget();
                this.move();

                this.world.getItem('debugText').values['estimateDecelerationPathSize'] = this.estimateDecelerationPathSize();
            }

            this.holdPost = function() {

                if (this.lockedTarget) {    // refresh from world
                    this.lockedTarget = this.world.getItem(this.lockedTarget.id);
                }

                // reevaluating your target may be usefull sometimes
                if(!this.world.clock.isLocked([this.id, 'reevaluate_target'])) {
                    this.lockedTarget = null;
                }

                if (!this.lockedTarget && !this.lockOnClosestTarget()) {
                    return; // no targets, just you wait ;)
                }

                // debug text for target locking ...
                // this.world.debugText.values[this.id + '.lockedTarget'] = this.lockedTarget ? this.lockedTarget.id + " ( hp = " + this.lockedTarget.hp + " )" : "no target";

                if (!this.lockedTarget) {
                    return; // nothing to do ...
                }

                var angleBetween = this.points.getAngleBetween('top', this.lockedTarget.points.getPoint('pivot'));

                this.points.rotate( angleBetween > 0 ? -5 : +5);

                if(angleBetween < 10) { // do not shoot space itself :)
                    this.fire();
                }
            }

            this.rotateTowardsPoint = function(target) {
                var angleBetween = this.points.getAngleBetween('top', target);

                this.world.debugText.values['angleBetween'] = Math.roundTo(angleBetween, 2);

                if(Math.abs(angleBetween) < 5) return true;

                this.points.rotate( angleBetween > 0 ? -5 : +5);

                return false;
            }

            this.rotate = function(angle) {
                if(this.__cmdRotate === '__state_done') {
                    return true;
                }

                if(this.__cmdRotate === undefined) {
                    this.__cmdRotate = angle;
                }

                this.points.rotate( (this.__cmdRotate > 0 ? 5 : -5) );
                this.__cmdRotate += (this.__cmdRotate > 0 ? -5 : +5);

                if(Math.abs(this.__cmdRotate) < 5) {
                    this.__cmdRotate = '__state_done';
                    return true;
                } else {
                    return false;
                }
            }

            this.rotateReset = function() {
                this.__cmdRotate = undefined;
            }

            this.turnAround = function() {
                return this.rotate(180);
            }


            // return bool if lock was aquired.
            this.lockOnRandomTarget = function() {
                var targets = this.world.getItemsByClass('asteroid');
                var targetKeys = Object.keys(targets);

                if (targetKeys.length === 0) return false;

                this.lockedTarget = targets[targetKeys[Math.randomInt(0, targetKeys.length - 1)]];
                return true;
            }

            this.lockOnClosestTarget = function() {
                var targets = this.world.getItemsByClass('asteroid');
                var targetKeys = Object.keys(targets);

                if (targetKeys.length === 0) return false;

                this.lockedTarget = null;
                var distance = null;
                var targetDistance = null;

                for(var i in targets) {
                    if(distance == null) {
                        this.lockedTarget = targets[i];
                        distance = VectorMath.distance(targets[i].points.getPoint('pivot'), this.points.getPoint('pivot'));
                        continue;
                    }

                    targetDistance = VectorMath.distance(targets[i].points.getPoint('pivot'), this.points.getPoint('pivot'));

                    if(targetDistance<distance) {
                        this.lockedTarget = targets[i];
                        distance = targetDistance;
                    }
                }                
            }


            }

            Drone.prototype = new Ship(0, 0, 1);

            return asteroids;

        })(asteroids || {});