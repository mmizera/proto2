
//
//	asteroids prototype 2 [ by Acko, 08.05.2014 ]
//	


// augment javascript

Math.roundTo = function(num, to) {
	to = to || 0;
    return +(Math.round(num + ("e+" + to)) + ("e-" + to));	// nasty hack (mozzila does this xD https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round)
}

Math.randomInt = function(low, high) {
	low = low || 0;
	high = high || 99999999;

	if(low === high) throw "You must specify range, low can not equals high.";

	return Math.floor( (Math.random() * (high-low+1)) + low );
}

Math.randomFloat = function(low, high, decimalPlaces) {
	low = low || 0;
	high = high || 99999999;
	decimalPlaces = decimalPlaces || 2;

	return Math.roundTo( (Math.random() * (high-low) + low), decimalPlaces );	
}

var asteroids = (function(asteroids) {
	
	var Key = asteroids.Key = function () {};
    asteroids.Key.SPACE = 32;
    asteroids.Key.ARROW_LEFT = 37;
    asteroids.Key.ARROW_UP = 38;
    asteroids.Key.ARROW_RIGHT = 39;
    asteroids.Key.ARROW_DOWN = 40;

	var Direction = asteroids.Direction = function() {}
	asteroids.Direction.NORTH = [0, -1];
	asteroids.Direction.SOUTH = [0, 1];
	asteroids.Direction.WEST = [-1, 0];
	asteroids.Direction.EAST = [1, 0];

	asteroids.Arrow = function(x,y,scale) {

		var self = this;

		x = x || 0;

		y = y || 0;

		this.scale = scale || 1;

		this.strokeStyle = "#f00";

		this.world = null;

		this.id = "arrow";

		this.velocity = [0,0];

		this.ACCELERATION = 0.05;

		this.MAX_VELOCITY = 7;

		var points = {
			top : [ x,y-(self.scale*25) ],

			topLeft : [ x-10,y-(self.scale*10) ],
			topRight : [ x+10,y-(self.scale*10) ],

			bottom : [ x,y+(self.scale*25) ],

			pivot : [x,y]
		};

		this.width = VectorMath.distance(points.top, points.bottom);

		this.height = VectorMath.distance(points.topLeft, points.topRight);

		this.getDirection = function() {
			return VectorMath.normalize(VectorMath.substract(points.top, points.pivot));
		}

		this.draw = function(ctx) {			
			var p = points;
			
			ctx.moveTo(p.bottom[0], p.bottom[1]);	// bottom
			ctx.lineTo(p.top[0], p.top[1]); // top
			ctx.lineTo(p.topLeft[0], p.topLeft[1]); // topLeft
			ctx.lineTo(p.topRight[0], p.topRight[1]); // topRight
			ctx.lineTo(p.top[0], p.top[1]);	// top

			ctx.strokeStyle = self.strokeStyle;
			ctx.fillStyle = self.strokeStyle;
			ctx.stroke();
			ctx.fill();
		}

		this.rotate = function(angleDeg) {
			if(!!!angleDeg) return;	// starting to think in javascript ... nah, I just put this here for funn xD

			for(var i in points) {
				if(i === "pivot") continue;

				points[i] = VectorMath.rotate(points[i], angleDeg, [points.pivot[0], points.pivot[1]]);
			}
		}

		this.move = function() {
			if(self.velocity[0] === 0 && self.velocity[1] === 0) return;

			var velocity = self.velocity;
			var pivot = points.pivot;
			var offscreen = this.world.isOffscreen(pivot, self.width, self.height);
			
			if(!!offscreen) {
				this.world.debugText.values["Offscreen"] = "true";

				var stageW = app.stage.width;
				var stageH = app.stage.height;
				
				if(VectorMath.equals(Direction.NORTH, offscreen)) 
				{ 
					self.moveTo(pivot[0], pivot[1]+stageW); 
				} 
				else if(VectorMath.equals(Direction.SOUTH, offscreen)) 
				{ 
					self.moveTo(pivot[0], pivot[1]-stageW); 
				} 
				else if(VectorMath.equals(Direction.WEST, offscreen)) 
				{ 
					self.moveTo(pivot[0]+stageH, pivot[1]); 
				}
				else if(VectorMath.equals(Direction.EAST, offscreen)) 
				{ 
					self.moveTo(pivot[0]-stageH, pivot[1]); 
				} else 
				{
					self.moveTo(400,400);
				}
				
			} else {
				this.world.debugText.values["Offscreen"] = "false";
			}

			for(var i in points) {
				points[i] = VectorMath.add(points[i], velocity);
			}
		}

		this.moveTo = function(x,y) {
			if(VectorMath.equals(points.pivot, [x,y])) return;

			var moveTo = VectorMath.substract([x,y], points.pivot);

			for(var i in points) {
				points[i] = VectorMath.add(points[i], moveTo);
			}
		}

		this.accelerate = function() {
			self.velocity = VectorMath.add(self.velocity, VectorMath.multiply(self.getDirection(), self.ACCELERATION));

			// max velocity
			var vsize = VectorMath.size(self.velocity);

			if(vsize > self.MAX_VELOCITY) {
				self.velocity = VectorMath.multiply( VectorMath.normalize(self.velocity), self.MAX_VELOCITY);
			} 

			if(vsize < -self.MAX_VELOCITY) {
				self.velocity = VectorMath.multiply( VectorMath.normalize(self.velocity), -self.MAX_VELOCITY);
			}
		}

		this.update = function() {
			// key binds
			if( !!self.world.keyPressed[Key.ARROW_LEFT] ) self.rotate(-5);
			if( !!self.world.keyPressed[Key.ARROW_RIGHT] ) self.rotate(+5);
			if( !!self.world.keyPressed[Key.ARROW_UP] ) self.accelerate();
			// update
			this.move();
		}
	}
	
	var DebugText = asteroids.DebugText = function() {
		var self = this;

		this.id = "debugText";

		this.lineHeight = 12;

		this.visible = true;

		this.values = {

			toArray : function() {

				var self = this;
				var ret = [];

				for(var i in self) {
					if(typeof self[i] === "function") continue;

					ret.push(i + " : '"+self[i]+"'");
				}

				return ret;
			}
		};

		this.draw = function(ctx) {
			ctx.font = "12px monospace";
			ctx.fillStyle = "#0f0";	

			var rows = self.values.toArray();
			for(var i in rows) {
				ctx.fillText(rows[i], 10, 10 + this.lineHeight * ((i*1)+1));
			}

			
		}

	}

	var Ship = asteroids.Ship = function(x,y,scale) {

		var self = this;

		scale = scale || 1;

		this.world = null;

		this.velocity = [0,0];

		this.ACCELERATION = 0.05;

		this.MAX_VELOCITY = 7;

		var FIRE_RATE = 300; // 1 projectile per xxx milisec

		var fireActionLock = 0;

		this.id = "ship";
 
		this.points = new Points({
			pivot : [ x, y ],

			top : [ x, y - (10 * scale) ], 
			left : [ x - (5 * scale), y + (10 * scale) ],
			right : [ x + (5 * scale), y + (10 * scale) ],

			bottom : [ x, y + (10 * scale) ]
		});

		this.width = VectorMath.distance(this.points.getPoint("top"), this.points.getPoint("bottom"));

		this.height = VectorMath.distance(this.points.getPoint("left"), this.points.getPoint("right"));

		this.update = function() {
 			// key bindings
 			if( !!self.world.keyPressed[Key.ARROW_LEFT] ) self.points.rotate(-5);
 			if( !!self.world.keyPressed[Key.ARROW_RIGHT] ) self.points.rotate(+5);
 			if( !!self.world.keyPressed[Key.ARROW_UP] ) self.accelerate();
 			if( !!self.world.keyPressed[Key.SPACE] ) self.fire();

 			// actions
 			self.move();
		}

		this.move = function() {
			var w = self.world;

			var offscreen = w.isOffscreen(self.points.getPoint('pivot'), self.width, self.height);
			if(offscreen) {
				self.points.resetPositionInRectangle(offscreen, w.stage.width, w.stage.height);
			} 

			self.points.move(self.velocity);

			self.collide();
		}

		this.fire = function() {
			var now = new Date().getTime();

			if(now < fireActionLock) return; // reloading or shit ...

			var pivot = VectorMath.add(self.points.getPoint("top"), VectorMath.multiply(self.points.getDirection(), 5));
			
			var velocity = VectorMath.multiply(self.points.getDirection(), self.MAX_VELOCITY + 0.5);
			velocity = VectorMath.add(self.velocity, velocity);

			this.world.addItem(new Projectile(pivot, velocity));

			fireActionLock = ( now ) + FIRE_RATE;
		}

		this.draw = function(ctx) {
			var p = self.points.getPoints();

			ctx.strokeStyle = "#fff";
			ctx.fillStyle = "#fff";

			ctx.moveTo(p.top[0], p.top[1]);
			ctx.lineTo(p.left[0], p.left[1]);
			ctx.lineTo(p.pivot[0], p.pivot[1]);
			ctx.lineTo(p.right[0], p.right[1]);
			ctx.lineTo(p.top[0], p.top[1]);

			ctx.stroke();
			ctx.fill();
		}

		this.accelerate = function() {
			self.velocity = VectorMath.add(self.velocity, VectorMath.multiply(self.points.getDirection(), self.ACCELERATION));

			// max velocity
			var vsize = VectorMath.size(self.velocity);

			if(vsize > self.MAX_VELOCITY) {
				self.velocity = VectorMath.multiply( VectorMath.normalize(self.velocity), self.MAX_VELOCITY);
			} 

			if(vsize < -self.MAX_VELOCITY) {
				self.velocity = VectorMath.multiply( VectorMath.normalize(self.velocity), -self.MAX_VELOCITY);
			}
		}

		this.collide = function() {
			var asteroids = this.world.getItemsByClass('asteroid');

			for(var i in asteroids) {
				if(Collisions.circleCollision(self, asteroids[i])) {
					self.alive = false;
					this.world.game.state = GameState.END;
					break;
				}
			}
		}
	}

	var Projectile = asteroids.Projectile = function(pivot, velocity, scale) {

		var self = this;

		this.alive = true;

		scale = scale || 4;
 
		this.world = null;

		var x = pivot[0];
		var y = pivot[1];

		this.points = new Points({
			pivot : [x,y],
			top : [ x, y+ (-1*scale) ],
			bottom : [ x, y+(1*scale) ],
			left :[ x+(-1*scale), y ],
			right :[ x+(+1*scale), y ]
		});

		this.width = VectorMath.distance(this.points.getPoint("top"), this.points.getPoint("bottom"));

		this.height = VectorMath.distance(this.points.getPoint("left"), this.points.getPoint("right"));

		this.update = function() {
			self.points.rotate(5);
			self.points.move(velocity);
			self.collide();

			if(self.world.isOffscreen(self.points.getPoint("pivot"), self.width, self.height)) {
				self.alive = false;
			}
		}

		this.draw = function(ctx) {
			var p = this.points.getPoints();

			ctx.strokeStyle = "#f00";
			
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
			for(var i in asteroids) {
				if(Collisions.circleCollision(self, asteroids[i]) === CollisionType.INNER) {
					self.alive = false;
					asteroids[i].hit();
					break;	// one projectile destroy one asteroid
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

		this.hp = Math.round(scale*MAX_HP);
		if(this.hp > MAX_HP) this.hp = MAX_HP;

		var generatePoints = function(x,y,scale, nodes) {

			nodes = nodes || Math.randomInt(5, 9);

			var point = VectorMath.add([x,y], VectorMath.multiply( Direction.NORTH, (Math.randomInt(20, 80) * scale) ) );

			var points = new Points({
				pivot : [x,y],
				top : point
			});

			var angleArea = 360 / nodes;

			for(var i = 0; i < nodes; i++) {
				var angleDeg = Math.randomInt(i*angleArea, (i+1)*angleArea);
				
				point = VectorMath.rotate(points.getPoint('top'), angleDeg, [x,y]);

				points.add(point, "point_" + i);
				pointsOrder.push("point_" + i);
			}

			return points;
		}

		var points = generatePoints(pivot[0], pivot[1],scale, nodes);

		this.points = points;	// TODO : this can get lil bit confusing ... points must be exposed due collision detection

		var size = VectorMath.distance(points.getPoint('pivot'), points.getPoint('top')) * 2;

		this.draw = function(ctx) {
			var p = points.getPoints();
			var pivot = points.getPoint('pivot');
			var first = true;
			var firstPoint = [];
			for(var i in pointsOrder) {
				if(i === 'pivot') continue;

				if(first) {
					ctx.moveTo(p[ pointsOrder[i] ][0], p[ pointsOrder[i] ][1]);
					firstPoint = [ p[ pointsOrder[i] ][0], p[ pointsOrder[i] ][1] ];
					first = false;
				} else {
					ctx.lineTo(p[ pointsOrder[i] ][0], p[ pointsOrder[i] ][1]);
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
			
			if(self.hp > 5) {
				ctx.fillStyle = "#0f0";	
			} else if(self.hp > 2) {
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

			if(self.world.isOffscreen(points.getPoint('pivot'), size + 50)) {	// TODO: fix 'bulgarian' constant :)
				this.alive = false;
			}
		}

		// asteroid was hit by something 
		this.hit = function() {
			--self.hp;

			if(self.hp <= 0) {
				self.alive = false;
				this.world.game.score += Math.round(self.scale * 10) * 10;
				// this.world.game.score += 10;
			}
		}
	}

	var Circle = asteroids.Circle = function(pivot, radius) {
		this.draw = function(ctx) {
			ctx.strokeStyle = "#fff";
			ctx.arc(pivot[0], pivot[1], radius, Angle.toRad(0), Angle.toRad(360));
			ctx.stroke();
		}
	}

	var GameState = asteroids.GameState = function () {};

	GameState.START = 0;
	GameState.IN_PROGRESS = 1;
	GameState.END = 2;

	var Game = asteroids.Game = function() {

		this.score = 0;

		var self = this;

		this.state = GameState.START;

		// init
		var stage = getStage(800,800);

		var app = new App(stage);

		this.app = app;	// debug purpose only

		var generateAsteroidsLock = 0;

		var GENERATE_ASTEROIDS_RATE = 500; // in milis

		this.update = function() {
			switch(self.state) {
				case GameState.START : onStart();break;
				case GameState.IN_PROGRESS : onProgress();break;
				case GameState.END : onEnd();break;

				default: throw "Invalid game state. [ state = '"+self.state+"']";
			}

			app.world.debugText.values['score']= this.score;
		}

		var onStart = function() {
			app.world.nuke();
			app.world.addItem(new Ship(stage.width/2, stage.height/2));
			app.animate();
			self.state = GameState.IN_PROGRESS;

			app.world.game = self;	// for update callback (in prototype3 hierarchy app <-> world <-> game must be modified)

			this.score = 0;
		}

		var onProgress = function() {
			var now = Date.now();

			if(now > generateAsteroidsLock) {
				app.world.addItem(generateAsteroid(stage));
				generateAsteroidsLock = now + GENERATE_ASTEROIDS_RATE;

				GENERATE_ASTEROIDS_RATE = Math.randomInt(500, 1000);
			}

		}

		var onEnd = function() {
			// app.terminate();
			app.world.debugText.values["game.state"] = "GAME OVER";

			// TODO: temporary (restart game with mouse click)
			stage.onclick = function(ev) {
				location.reload();
			}
		}

		function getStage(w,h,bg) {
			var stage = document.createElement("canvas");
			stage.width = w || 800;
			stage.height = h || 800;
			stage.id = "stage";
			stage.style.background = bg || "#000";

			document.body.appendChild(stage);

			return stage;
		}

		var generateAsteroids = function(stage, count) {
			var asteroids = [];

			for(var i = 0; i < count; i++) {
				asteroids.push(generateAsteroid(stage));
			}

			return asteroids;
		}

		var generateAsteroid = function(stage) {

			var sW = stage.width;
			var sH = stage.height;

			var targetPoint = [ Math.randomInt(sW/2 - Math.round(sW*0.2), sW/2 + Math.round(sW*0.2)), Math.randomInt(sH/2 - Math.round(sH*0.2), sH/2 + Math.round(sH*0.2)) ];
			var pointOfOrigin = [ Math.randomInt(0,sW), Math.randomInt(0,sH) ];

			// start from edge
			switch(Math.randomInt(0,3)) {
				case 0 : pointOfOrigin = [ -50, pointOfOrigin[1] ];break;
				case 1 : pointOfOrigin = [ sW+50, pointOfOrigin[1] ];break;
				case 2 : pointOfOrigin = [ pointOfOrigin[0], -50 ];break;
				case 3 : pointOfOrigin = [ pointOfOrigin[0], sH+50 ];break;
			}

			var velocitySize = Math.randomFloat(0.20, 2, 2);
			var velocity = VectorMath.multiply(VectorMath.normalize(VectorMath.substract(targetPoint, pointOfOrigin)), velocitySize);

			var scale = Math.randomFloat(0.20,1, 2);

			var rotateAngleDeg = Math.randomFloat(-0.50, 0.50, 2);

			return new Asteroid(pointOfOrigin, velocity, rotateAngleDeg, scale);
		}

		onStart();
	}

	var World = asteroids.World = function(stage) {

		var self = this;

		this.debugText = new DebugText();

		var items = {};

		var itemsByClass = {};

		this.stage = stage;

		this.keyPressed = [];

		var idcounter = 0;

		this.game = null;

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
			return itemsByClass[className]? itemsByClass[className] : {};
		}

		this.getItem = function(id) {
			return items[id];
		}

		this.addItems = function(items) {
			for(var i in items) {
				self.addItem(items[i]);
			}
		}

		this.addItem = function(obj, id) {
			if(!id) {
				if(obj.id) {
					id = obj.id;
				} else {
					id = "undefined_" + (++idcounter);	// generate id	
				}
			}

			obj.id = id;

			if(!obj.class) {
				obj.class = obj.constructor.name.toLowerCase() || "unknown";
			}
			
			if(obj.hasOwnProperty("alive")) obj.alive = true;

			if(obj.hasOwnProperty("world")) obj.world = self;	// inject world instance if requested

			items[obj.id] = obj;

			if(!itemsByClass[obj.class]) {
				itemsByClass[obj.class] = {};
			}

			itemsByClass[obj.class][obj.id] = obj;
		}

		this.update = function() {

			if(self.game && self.game.update) {
				self.game.update();
			}

			var i;
			
			for(i in items) {				
				if(items[i].hasOwnProperty("alive") && !items[i].alive) {
					delete itemsByClass[items[i].class][i];
					delete items[i];
					continue;
				}

				if(items[i].update) items[i].update();
			}
		}

		this.draw = function(ctx) {
			var i;

			ctx.clearRect(0,0,self.stage.width, self.stage.height);

			for(i in items) {

				if(items[i].visible === false) continue;

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

			if( x < -margin ) return Direction.WEST;
			if( y < -margin ) return Direction.NORTH;
			if( x > stageW + margin ) return Direction.EAST;
			if( y > stageH + margin ) return Direction.SOUTH;

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

			} catch(e) {
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
    	if(typeof vect2 === "number") vect2 = [vect2, vect2];
        return [ vect1[0] + vect2[0], vect1[1] + vect2[1] ];
    }

    asteroids.VectorMath.substract = function(vect1, vect2) {
    	if(typeof vect2 === "number") vect2 = [vect2, vect2];
        return [ vect1[0] - vect2[0], vect1[1] - vect2[1] ];
    }

    asteroids.VectorMath.multiply = function(vect1, vect2) {
    	if(typeof vect2 === "number") vect2 = [vect2, vect2];
        return [ vect1[0] * vect2[0], vect1[1] * vect2[1] ];
    }

    asteroids.VectorMath.size = function(vect1) {
        return VectorMath.distance(vect1, [0, 0]);
    }

    asteroids.VectorMath.distance = function(vect1, vect2) {
        var a = Math.abs(vect1[0] - vect2[0]);
        var b = Math.abs(vect1[1] - vect2[1]);

        return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    }

    asteroids.VectorMath.normalize = function(vect) {
        var length = VectorMath.size(vect);
        return [ vect[0] / length, vect[1] / length ];
    }

    asteroids.VectorMath.dotProduct = function(vect1, vect2) {
        return (vect1[0] * vect2[0]) + (vect1[1] * vect2[1]);
    }

    asteroids.VectorMath.angleBetween = function(vect1, vect2) {
        return Math.acos(VectorMath.dotProduct(VectorMath.normalize(vect1), VectorMath.normalize(vect2)));
    }

    asteroids.VectorMath.rotate = function(vect, angleDeg, pivot) {
        var angleRad = Angle.toRad(angleDeg || 0);
        pivot = pivot || [0,0];

        var cs = Math.cos(angleRad);
        var sn = Math.sin(angleRad);

        var x = (vect[0]-pivot[0]) * cs - (vect[1]-pivot[1]) * sn + pivot[0];
        var y = (vect[0]-pivot[0]) * sn + (vect[1]-pivot[1]) * cs + pivot[1] ;

        return [x, y];
    }

    asteroids.VectorMath.inverse = function(vect) {
    	return [ vect[0]*-1, vect[1]*-1 ];
    }

    asteroids.VectorMath.equals = function(vect1, vect2) {
    	return vect1[0] === vect2[0] && vect1[1] === vect2[1];
    }

    var Points = asteroids.Points = function(points) {
		
    	var self = this;

		if(typeof points.pivot === "undefined" || typeof points.top === "undefined") {
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
			if(points[index]) {
				return points[index];
			} 

			throw "No point with index '"+index+"'.";
		}

		this.getPoints = function() {
			return points;
		}

		this.rotate = function(angleDeg) {
			
			if(!!!angleDeg) return;	// starting to think in javascript ... nah, I just put this here for funn xD

			for(var i in points) {
				if(i === "pivot") continue;

				points[i] = VectorMath.rotate(points[i], angleDeg, [points.pivot[0], points.pivot[1]]);
			}
		}

		this.move = function(velocity) {
			if(velocity[0] === 0 && velocity[1] === 0) return;

			var pivot = points.pivot;
			
			for(var i in points) {
				points[i] = VectorMath.add(points[i], velocity);
			}
		}

		this.moveTo = function(x,y) {
			if(VectorMath.equals(points.pivot, [x,y])) return;

			var moveTo = VectorMath.substract([x,y], points.pivot);

			for(var i in points) {
				points[i] = VectorMath.add(points[i], moveTo);
			}
		}

		this.getDirection = function() {
			return VectorMath.normalize(VectorMath.substract(points.top, points.pivot));
		}

		this.resetPositionInRectangle = function(offsetPosition, rectW, rectH) {

			var pivot = points.pivot;

			if(VectorMath.equals(Direction.NORTH, offsetPosition)) 
			{ 
				self.moveTo(pivot[0], pivot[1]+rectW); 
			} 
			else if(VectorMath.equals(Direction.SOUTH, offsetPosition)) 
			{ 
				self.moveTo(pivot[0], pivot[1]-rectW); 
			} 
			else if(VectorMath.equals(Direction.WEST, offsetPosition)) 
			{ 
				self.moveTo(pivot[0]+rectH, pivot[1]); 
			}
			else if(VectorMath.equals(Direction.EAST, offsetPosition)) 
			{ 
				self.moveTo(pivot[0]-rectH, pivot[1]); 
			} else 
			{
				self.moveTo(rectW,rectH);
			}

		}

	}

	var CollisionType = asteroids.CollisionType = function() {}

	CollisionType.NONE = 0;
	CollisionType.TOUCH = 1;
	CollisionType.INNER = 2;

	var Collisions = asteroids.Collisions = function() {}

	asteroids.Collisions.circleCollision = function(obj1, obj2) {
		if(!obj1.points) throw "obj1 does not expose points field.";
		if(!obj2.points) throw "obj2 does not expose points field.";

		var pivot1 = obj1.points.getPoint('pivot');
		var pivot2 = obj2.points.getPoint('pivot');

		var rad1 = obj1.points.getRadius();
		var rad2 = obj2.points.getRadius();

		var radSum = rad1 + rad2;
		var distance = VectorMath.distance(pivot1, pivot2);

		if(radSum > distance) return CollisionType.INNER;
		if(radSum == distance) return CollisionType.TOUCH;
		
		return CollisionType.NONE;
	}

	return asteroids;

})(asteroids || {});