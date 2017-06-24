// Might need a global assets object in order to ensure all binary data is loaded before things start off.

// Library of functions.
var Point2D = {
	getAngle: function(point) {
		return Math.atan2(point.y, point.x);
	},

	getDirection: function(point_from, point_to){
		var delta_x = point_to.x - point_from.x;
	    var delta_y = point_to.y - point_from.y;

	    var length = this.getLength({
			x: delta_x,
			y: delta_y
		});

		if (length > 0) {
			return this.getPoint(delta_x / length, delta_y / length);
		} else {
			// ‘from’ and ‘to’ are identical
			return this.getPoint(0, 0)
		}
	},

	getDistance: function(point_a, point_b){
		// The x and y variables hold a vector pointing from point b to point a.
		var x = point_a.x - point_b.x;
		var y = point_a.y - point_b.y;

		// Now, distance between the points is just length (magnitude) of this vector, calculated like this:
		return this.getLength(this.getPoint(x, y));
	},

	getLength: function(point){
		return Math.sqrt(point.x * point.x + point.y * point.y);
	},

	getPoint: function(x, y){
		return {
			x: x || 0,
			y: y || 0
		}
	},

	setAngle: function(angle, length){
		return this.getPoint(length * Math.cos(angle), length * Math.sin(angle));
	}
}

// Base Object class.
function Entity(options){
	/*
		You’ll need some more properties including:
			Sprite
			Current Sprite Frame
			Total number of frames
			isAlive/isDestroyed
			Health
			Bonus Multiplier (Player-specific)
			Prize (Enemy-specific)
	*/

	// Center of mass (usually).
    this.position = Point2D.getPoint();

    // Linear velocity.
    this.velocity = Point2D.getPoint();

    // Acceleration could also be named `force`, like in the Box2D engine.
    this.acceleration = Point2D.getPoint();

	this.container = window;

    this.mass = 1;
	this.height = 0;
	this.width = 0;
	this.age = 0;
	this.maxAge;

	this.applyForce = function(force, scale) {
	  if (typeof scale === 'undefined') {
		scale = 1;
	  }
	  this.acceleration.x += force.x * scale / this.mass;
	  this.acceleration.y += force.y * scale / this.mass;
	}

	this.applyImpulse = function(impulse, scale) {
	  if (typeof scale === 'undefined') {
		scale = 1;
	  }
	  this.velocity.x += impulse.x * scale / this.mass;
	  this.velocity.y += impulse.y * scale / this.mass;
	}

	this.checkBoundaries = function(islayer){
		if(this.position.x < this.container.offsetLeft) {
			this.position.x = this.container.offsetLeft;
			this.acceleration.x = this.acceleration.y = 0;
		}
		if(this.position.x + this.width > this.container.offsetLeft + this.container.width) {
			this.position.x = this.container.offsetLeft + this.container.width - this.width;
			this.acceleration.x = this.acceleration.y = 0;
		}
		if(this.position.y < this.container.offsetTop) {
			this.position.y = this.container.offsetTop;
			this.acceleration.x = this.acceleration.y = 0;
		}
		if(this.position.y + this.height > this.container.offsetTop + this.container.height) {
			this.position.y = this.container.offsetTop + this.container.height - this.height;
			this.acceleration.x = this.acceleration.y = 0;
		}
	}

	this.render = function(ctx){
		// The Entity should be able to draw itself.  The Entity will know what sprite and frame it is...
	},

	this.update = function(elapsed){
		// Acceleration is usually 0 and is set from the outside.  Velocity is an amount of movement (meters or pixels) per second.
		this.velocity.x += this.acceleration.x * elapsed;
		this.velocity.y += this.acceleration.y * elapsed;

		this.position.x += this.velocity.x * elapsed;
		this.position.y += this.velocity.y * elapsed;

		this.acceleration.x = this.acceleration.y = 0;

		this.updateAge(elapsed);
		this.checkBoundaries();
	}

	this.updateAge = function(elapsed){
		this.age += elapsed;
	}
	// Load optional parameters.
	if(options){
		for(var key in options){
			this[key] = options[key];
		}
	}
};

// Parallax.
function Frame(url){ // The base unit for parallax FX.  Basically, just an image.
	this.img = new Image();
	this.img.src = url;
}
function Layer(options){ // The controller for a collection of Frame objects.
	// Inherit from base class.
	Entity.call(this);

	// Array to hold the images.
	this.frames = [];

	// Set some defaults.
	this.depth = 1;
	this.isRandom = true;
	this.isForeground = false;

	this.startFrameIndex = 0;
	this.currentFrameIndex = 0;
	this.nextFrameIndex = 0;

	// Load optional parameters.
	if(options){
		for(var key in options){
			this[key] = options[key];
		}
	}

	// Utility functions.
	this.render = function(ctx){
		ctx.drawImage(this.frames[this.currentFrameIndex].img, this.position.x, this.position.y);
		ctx.drawImage(this.frames[this.nextFrameIndex].img, this.position.x + this.width, this.position.y);
	}

	this.getNextFrame = function(){
		if(this.isRandom){
			return Math.floor(Math.random() * this.frames.length);
		}
	}

	this.updateFrames = function(){
		// Swap out the next frame into the current frame.
		this.currentFrameIndex = this.nextFrameIndex;

		// Generate the next frame index.
		this.nextFrameIndex = this.getNextFrame();

		// Reset the position.
		this.position.x = this.position.x + this.width;
	}

	this.checkBoundaries = function(){
		if(this.position.x + this.width < 0){
			this.updateFrames();
		}
	}
}
function Background(options){
	this.layers = [];

	if(options){
		for(var key in options){
			this[key] = options[key];
		}
	}

	this.loadLayer = function(layer){
		this.layers.push(layer);
	}

	this.update = function(elapsed){
		for(var i=0; i<this.layers.length; i++){
			this.layers[i].update(elapsed);
			this.layers[i].checkBoundaries();
		}
	}
}

// Main app.
var app = {
	init: function(){
		var self = this;

		// Debugging control for identifying the state of the loop.
		this.isAnimating;

		this.loadAssets(function(){
			self.initCanvas();
			self.initPlayer();
			self.initObjects();
			self.initParticles();
			self.initBackgrounds();
			self.attachListeners();
		});
    },

	attachListeners: function(){
		var self = this;

		// Listener for an object to move towards mouse coordinates.
		this.canvas.addEventListener('mousemove', function(e){
			self.mouseLocation = Point2D.getPoint(e.clientX, e.clientY);
		});

		this.canvas.addEventListener('click', function(){
			var event;
			if(self.isAnimating){
				event = new CustomEvent('animation-end', {bubbles: true, cancelable: true});
				self.isAnimating = false;
			} else {
				event = new CustomEvent('animation-start', {bubbles: true, cancelable: true});
				self.isAnimating = true;
			}
			self.canvas.dispatchEvent(event);
		});

		this.canvas.addEventListener('animation-start', function(e){
			self.startMainLoop();
		});

		this.canvas.addEventListener('animation-end', function(e){
			self.stopMainLoop();
		});
	},

	clear: function(){
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	},

	createObject: function(){
		var obj = new Entity();
		obj.width = 37;
		obj.height = 41;

		obj.position = {
			x: this.getRandomValue(0, this.canvas.width - obj.width),
			y: this.getRandomValue(0, this.canvas.height - obj.height)
		}
		obj.container = this.canvas;

		return obj;
	},

	createParticle: function(position, velocity){
		var obj = new Entity();
		obj.radius = this.getRandomValue(1, 4);

		obj.position = position || {
			x: this.canvas.width / 2,
			y: this.canvas.height / 2
		}

		obj.velocity = velocity || {
			x: this.getRandomValue(-50, 50),
			y: this.getRandomValue(0, -50)
		};

		obj.container = this.canvas;

		obj.maxAge = 1;

		return obj;
	},

	drawImage: function(image_obj, x, y){
		this.ctx.drawImage(image_obj, x, y);
	},

	generateParticles: function(){
		if(this.particles.length < this.maxParticles){
			for (var i=0; i<this.particleGenerationRate; i++){
				this.particles.push(this.createParticle());
			}
		}
	},

	getRandomValue: function(min, max){
		min = min || 0;
		max = max || 0;
		return Math.floor(Math.random() * (max - min + 1) + min);
	},

	initBackgrounds: function(){
		this.background = new Background({
			layers: [new Layer({
				frames: [new Frame('images/5.png')],
				depth: 1
			}), new Layer({
				frames: [new Frame('images/2.png')],
				depth: 8
			})/*, new Layer({
				frames: [new Frame('images/3.png')],
				depth: 3
			}), new Layer({
				frames: [new Frame('images/2.png')],
				depth: 4
			})*/, new Layer({
				frames: [new Frame('images/1.png')],
				depth: 10,
				isForeground: true
			})]
		});

		for(var i=0; i<this.background.layers.length; i++){
			this.background.layers[i].width = 960;
			this.background.layers[i].applyImpulse(Point2D.getPoint(this.background.layers[i].depth * 2, 0), -10);
		}
	},

	initCanvas: function(){
		var self = this;

		// Test fill the canvas with a color.
		this.canvas = document.querySelector('canvas');
		this.ctx = this.canvas.getContext('2d');

		this.canvas.setAttribute('height', 540);
		this.canvas.setAttribute('width', 960);

		this.canvas.setAttribute('height', window.innerHeight);
		this.canvas.setAttribute('width', window.innerWidth);
	},

	initObjects: function(){
		var self = this;

		this.objects = [];
		for(var i=0; i<100; i++){
			this.objects.push(this.createObject());
		}
	},

	initParticles: function(){
		var self = this;

		this.particles = [];
		this.maxParticles = 25;
		this.particleGenerationRate = 1; // Number of particles to render per frame.
	},

	initPlayer: function(){
		this.Ship = new Entity();
		this.Ship.height = 41;
		this.Ship.width = 37;
		this.Ship.position.x = this.canvas.width / 2;
		this.Ship.position.y = this.canvas.height / 2;
		this.Ship.container = this.canvas;
	},

	loadAssets: function(callback){
		var self = this;

		this.images = [];
		var imageUrls = ['images/icon_menu.png'];

		var totalImagesToLoad = imageUrls.length;
		for(var i = imageUrls.length-1; i>=0; i--){
			var img = new Image();
			img.src = imageUrls[i];
			self.images.push(img);
			img.onload = function(){
				totalImagesToLoad--;
				if(totalImagesToLoad == 0){
					callback();
				}
			};
		}
	},

	mainLoop: function() {
		var self = this;
		var now = window.Date.now();

		if (this.lastUpdate) {
			var elapsed = (now - this.lastUpdate) / 1000;
			this.lastUpdate = now;

			// Clear the canvas.
			this.clear();

			// Update all game objects here.
			this.updateObjects(elapsed); // This would be a global function that loops over every game object and triggers the .update() function for said game objects passing ‘elapsed’ as the lone argument.

			this.generateParticles();

			// Render the game objects.
			this.renderObjects(); // Again, this would be a global function that loops over every game object and triggers the (not yet defined) render function.  If done with a canvas, it would be a draw.  If not, umm...
		} else {
			// Skip first frame, so elapsed is not 0.
			this.lastUpdate = now;
		}

		// Call the looper again.  This makes the `main_loop` function run 60 frames per second (or slower, depending on monitor's refresh rate).
		this._loop = window.requestAnimationFrame(function(){
			self.mainLoop();
		});
	},

	renderObjects: function(){
		// Backgrounds.
		for(var i=0, l=this.background.layers.length; i<l; i++){
			if(!this.background.layers[i].isForeground){
				this.background.layers[i].render(this.ctx);
			}
		}

		// Other objects.
		for(var i=0, l=this.objects.length; i<l; i++){
			this.drawImage(this.images[0], this.objects[i].position.x, this.objects[i].position.y);
		}

		for(var i=0, l=this.particles.length; i<l; i++){
			this.ctx.beginPath();
			this.ctx.arc(this.particles[i].position.x, this.particles[i].position.y, this.particles[i].radius, 0, 2 * Math.PI, false);
			this.ctx.closePath();

			// Set the opacity based on the age.
			var opacity = 1 - (this.particles[i].age / this.particles[i].maxAge);
			this.ctx.fillStyle = 'rgba(255, 0, 0, ' + opacity + ')';
			this.ctx.fill();
		}

		// Main object.
		this.drawImage(this.images[0], this.Ship.position.x, this.Ship.position.y);

		// Foregrounds.
		for(var i=0, l=this.background.layers.length; i<l; i++){
			if(this.background.layers[i].isForeground){
				this.background.layers[i].render(this.ctx);
			}
		}
	},

	startMainLoop: function(){
		this.lastUpdate;
		this.mainLoop();
	},

	stopMainLoop: function(){
		window.cancelAnimationFrame(this._loop);
		this._loop = undefined;
		this.lastUpdate = undefined;
	},

	updateObjects: function(elapsed){
		// Make the Objects move towards the last known mouse position.
		if(this.mouseLocation){
			this.Ship.position = {
				x: this.mouseLocation.x - this.Ship.width / 2,
				y: this.mouseLocation.y - this.Ship.height / 2
			}

			for(var i=0; i<this.objects.length; i++){
				var direction = Point2D.getDirection(this.objects[i].position, this.mouseLocation);
				this.objects[i].applyImpulse(direction, 10);
			}
		}

		// Update the backgrounds.
		this.background.update(elapsed);

		// Update the main object.
		this.Ship.update(elapsed);

		// Update secondary objects.
		for(var i=0, l=this.objects.length; i<l; i++){
			this.objects[i].update(elapsed);
		}

		var _ParticleIndexesToRemove = [];
		for(var i=0, l=this.particles.length; i<l; i++){
			this.particles[i].update(elapsed);
			if(this.particles[i].age > this.particles[i].maxAge){
				_ParticleIndexesToRemove.push(i);
			}
		}
		// Clean out any particles that are passed their maxAge.
		for(var i=_ParticleIndexesToRemove.length; i>0; i--){
			this.particles.splice(_ParticleIndexesToRemove[i], 1);
		}
	}
};

// Kick things off.
app.init();
