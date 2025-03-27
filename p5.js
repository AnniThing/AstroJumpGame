// p5.js Sketch: Astro Run - Endless Runner

// --- Game Configuration ---
const GRAVITY = 0.6;
const JUMP_FORCE = -11; // Initial jump velocity
const DOUBLE_JUMP_FORCE = -9;
const GROUND_Y_OFFSET = 80; // How high the ground is from the bottom
const SCORE_MILESTONE = 100;
const START_SPEED = 4;
const SPEED_INCREASE = 0.003; // How much speed increases per frame

// --- Game State ---
let astronaut;
let obstacles = [];
let particles = []; // For jetpack effect
let score = 0;
let highScore = 0; // Keep track of high score
let currentMilestone = SCORE_MILESTONE;
let backgroundIndex = 0;
let gameState = 'START'; // 'START', 'PLAYING', 'GAME_OVER'
let obstacleSpeed;
let spawnTimer;
let spawnInterval = 90; // Initial frames between obstacles
let groundY;

// --- Background Functions ---
// Store functions in an array to easily switch between them
let backgroundDrawers = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100); // HSB is great for spacey colors
  textAlign(CENTER, CENTER);
  textFont('monospace'); // Clean look for text

  groundY = height - GROUND_Y_OFFSET;
  obstacleSpeed = START_SPEED;
  spawnTimer = spawnInterval;

  // Define our background drawing functions
  defineBackgrounds();

  // Initialize Astronaut (only create it once)
  astronaut = new Astronaut();

  // Load high score from local storage if available
  let storedHighScore = getItem('astroRunHighScore');
  if (storedHighScore !== null) {
    highScore = parseInt(storedHighScore);
  }

  resetGame(); // Initial setup for starting state
}

function draw() {
  // --- Background ---
  // Call the current background drawing function
  backgroundDrawers[backgroundIndex % backgroundDrawers.length]();

  // --- Draw Ground ---
  fill(20, 80, 20); // Dark brown/greyish ground
  noStroke();
  rect(0, groundY, width, GROUND_Y_OFFSET);

  // --- Game State Logic ---
  switch (gameState) {
    case 'START':
      displayStartScreen();
      // Draw astronaut in idle pose on the ground
      astronaut.pos.y = groundY - astronaut.h / 2; // Place on ground
      astronaut.vel.y = 0;
      astronaut.isGrounded = true;
      astronaut.jumpCount = 0;
      astronaut.display();
      break;

    case 'PLAYING':
      updateGame();
      displayGame();
      break;

    case 'GAME_OVER':
      displayGameOverScreen();
      // Draw astronaut where they crashed
      astronaut.display();
      // Show obstacles frozen in place
       for (let obs of obstacles) {
        obs.display();
      }
      break;
  }

   // --- Draw UI ---
   displayUI();

   // --- Particle Effects --- (Draw on top)
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].display();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
}

// ============================
// Game State Functions
// ============================

function resetGame() {
  score = 0;
  currentMilestone = SCORE_MILESTONE;
  backgroundIndex = 0;
  obstacles = [];
  obstacleSpeed = START_SPEED;
  spawnTimer = spawnInterval;
  astronaut.reset(width / 4, groundY - astronaut.h / 2); // Reset astronaut position and state
  particles = []; // Clear particles
}

function startGame() {
  resetGame();
  gameState = 'PLAYING';
}

function updateGame() {
   // --- Update Score & Difficulty ---
  score++;
  obstacleSpeed += SPEED_INCREASE;
  // Gradually decrease spawn interval, but not too fast
  spawnInterval = max(40, 90 - score / 15);


  // --- Background Milestone Check ---
  if (score >= currentMilestone) {
    backgroundIndex++;
    currentMilestone += SCORE_MILESTONE;
    // Optional: Add a small visual flash or sound effect here
  }

  // --- Update Astronaut ---
  astronaut.applyGravity();
  astronaut.update();
  astronaut.checkGroundCollision(groundY);

  // --- Handle Obstacles ---
  // Spawn new obstacles
  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = random(spawnInterval * 0.8, spawnInterval * 1.2); // Add some randomness
  }

  // Update and check collisions for existing obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].update(obstacleSpeed);

    // Collision check
    if (astronaut.hits(obstacles[i])) {
        gameState = 'GAME_OVER';
        // Update high score if needed
        if (score > highScore) {
          highScore = score;
          storeItem('astroRunHighScore', highScore); // Save to local storage
        }
        // Optional: Add crash effect (particles, screen shake)
        break; // Exit loop once collision occurs
    }

    // Remove obstacles that are off-screen
    if (obstacles[i].isOffscreen()) {
      obstacles.splice(i, 1);
    }
  }
}

function displayGame() {
  // --- Draw Obstacles ---
  for (let obs of obstacles) {
    obs.display();
  }
  // --- Draw Astronaut ---
  astronaut.display();
}

function displayStartScreen() {
  fill(0, 0, 100, 80); // White text
  textSize(48);
  text('ASTRO RUN', width / 2, height / 3);
  textSize(24);
  text('Press SPACE to Jump (Twice for Double Jump)', width / 2, height / 2);
  text('Avoid the Obstacles!', width / 2, height / 2 + 40);
   textSize(18);
   text('Press SPACE to Start', width/2, height * 0.65);
}

function displayGameOverScreen() {
  fill(0, 100, 100, 90); // Reddish text
  textSize(60);
  text('GAME OVER', width / 2, height / 3);
  textSize(32);
  text(`Score: ${score}`, width / 2, height / 2);
  text(`High Score: ${highScore}`, width / 2, height / 2 + 45);

  textSize(20);
   fill(0, 0, 100, 80); // White
  text('Press R to Restart', width / 2, height * 0.65);
}

function displayUI() {
  // Display score and high score during gameplay and game over
  if (gameState === 'PLAYING' || gameState === 'GAME_OVER') {
    fill(0, 0, 100, 80); // White text
    textSize(24);
    textAlign(LEFT, TOP);
    text(`Score: ${score}`, 20, 20);
    textAlign(RIGHT, TOP);
    text(`High Score: ${highScore}`, width - 20, 20);
    textAlign(CENTER, CENTER); // Reset alignment
  }
    // Display instructions during gameplay
   if (gameState === 'PLAYING' && score < 150) { // Show for a bit at the start
     fill(0, 0, 100, map(score, 0, 150, 70, 0)); // Fade out
     textSize(16);
     text('SPACE = Jump / Double Jump', width / 2, 30);
   }
}

// ============================
// Obstacle Handling
// ============================

function spawnObstacle() {
  let minH = 20;
  let maxH = 60;
   // Make obstacles slightly harder over time by increasing min height
   minH = min(45, 20 + score / 50);

  let h = random(minH, maxH);
  let w = random(30, 50);
  // Maybe add different types later (e.g., floating obstacles)
  let obs = new Obstacle(width + w, groundY - h, w, h);
  obstacles.push(obs);
}


// ============================
// Background Drawing Functions
// ============================
function defineBackgrounds() {
    // --- Background 0: Simple Starfield ---
    backgroundDrawers.push(() => {
        background(240, 80, 10); // Dark Blue
        fill(0, 0, 100, 80); // White stars
        noStroke();
        for (let i = 0; i < 150; i++) {
            // Use noise for pseudo-random but consistent placement
            let x = noise(i * 10.1, frameCount * 0.001) * width * 1.2 - width * 0.1; // Slow horizontal drift
            let y = noise(i * 20.2) * height;
            let s = noise(i * 30.3) * 2 + 0.5;
            ellipse(x, y, s, s);
        }
    });

    // --- Background 1: Nebula Cloud ---
    backgroundDrawers.push(() => {
        background(270, 90, 15); // Dark Purple
        // Draw nebula clouds using Perlin noise
        let noiseScale = 0.005;
        let time = frameCount * 0.005; // Slow evolution
        for (let x = 0; x < width; x += 10) {
            for (let y = 0; y < height; y += 10) {
                let n = noise(x * noiseScale, y * noiseScale + time, time * 0.5);
                // Map noise to color and alpha
                let hue = map(n, 0.3, 0.7, 260, 320); // Purples to Pinks
                let brightness = map(n, 0.2, 0.8, 5, 40); // Low brightness for depth
                let alpha = map(n, 0.4, 0.6, 0, 50); // Make denser areas more opaque
                if (n > 0.4) { // Only draw denser parts
                    fill(hue, 80, brightness, alpha);
                    noStroke();
                    rect(x, y, 10, 10);
                }
            }
        }
         // Add some brighter stars on top
        fill(0, 0, 100, 90);
        for (let i = 0; i < 50; i++) {
            let x = noise(i * 15.1, frameCount * 0.0005) * width;
            let y = noise(i * 25.2) * height;
            let s = noise(i * 35.3) * 1.5 + 0.5;
            ellipse(x, y, s, s);
        }
    });

     // --- Background 2: Distant Planet ---
    backgroundDrawers.push(() => {
        background(220, 70, 12); // Deep Space Blue
         // Draw stars first
        fill(0, 0, 100, 70);
        noStroke();
        for (let i = 0; i < 100; i++) {
            let x = noise(i * 10.1+10) * width;
            let y = noise(i * 20.2+10) * height;
            let s = noise(i * 30.3+10) * 1.5 + 0.3;
            ellipse(x, y, s, s);
        }

        // Draw a large, distant planet (moves slowly with parallax)
        let planetX = width * 0.7 + cos(frameCount * 0.002) * 50; // Slow side-to-side movement
        let planetY = height * 0.3 + sin(frameCount * 0.003) * 30;
        let planetSize = width * 0.3;

        // Planet base color
        fill(30, 70, 50); // Orange/Brown Gas Giant
        ellipse(planetX, planetY, planetSize, planetSize);

         // Add some simple bands/details
         fill(35, 60, 60, 50);
         ellipse(planetX, planetY - planetSize * 0.2, planetSize * 0.95, planetSize * 0.2);
         fill(25, 65, 40, 40);
         ellipse(planetX, planetY + planetSize * 0.1, planetSize * 0.85, planetSize * 0.3);

        // Simple atmospheric haze
        fill(200, 50, 100, 10); // Light blueish haze
         for(let i = 0; i < 5; i++){
             ellipse(planetX, planetY, planetSize * (1 + i*0.02), planetSize * (1 + i*0.02));
         }
    });

        // --- Background 3: Asteroid Field ---
    backgroundDrawers.push(() => {
        background(250, 50, 5); // Very dark grey/blue
        noStroke();

        // Draw many asteroids at different depths (parallax)
        let layers = 3;
        for (let layer = 0; layer < layers; layer++) {
            let parallaxFactor = 0.1 + layer * 0.2; // Closer layers move faster
             let asteroidCount = 20 + layer * 15;
             let baseSize = 10 + layer * 15;
             let colorBrightness = 15 + layer * 10;

            fill(0, 0, colorBrightness, 90); // Greys

            for (let i = 0; i < asteroidCount; i++) {
                // Use noise for position, ensure they scroll
                 let noiseXSeed = i * 10.1 + layer * 100;
                 let noiseYSeed = i * 20.2 + layer * 100;
                 let noiseSizeSeed = i * 30.3 + layer * 100;

                 // Calculate base position using noise (so it's repeatable)
                 let baseX = noise(noiseXSeed) * width * 2; // Spread them out wider than screen
                 let y = noise(noiseYSeed) * height;

                 // Apply scrolling based on parallax
                 // Use modulo to wrap around seamlessly
                 let x = (baseX - frameCount * obstacleSpeed * parallaxFactor) % (width * 1.5);
                 if(x < -width * 0.25) x += width * 1.5; // Ensure wrap brings it back on the right

                 let s = noise(noiseSizeSeed) * baseSize + 5;

                 // Draw irregular asteroid shape (simple version)
                 ellipse(x, y, s, s * random(0.7, 1.3)); // Slightly irregular
            }
        }
    });

     // Add more background functions here following the same pattern...
}


// ============================
// Input Handling
// ============================

function keyPressed() {
  if (keyCode === 32) { // Space Bar
    if (gameState === 'PLAYING') {
      astronaut.jump();
       // Add jump particles
       createJetpackBurst(astronaut.pos.x, astronaut.pos.y + astronaut.h/2);
    } else if (gameState === 'START') {
      startGame();
       createJetpackBurst(astronaut.pos.x, astronaut.pos.y + astronaut.h/2);
    }
  } else if ((key === 'r' || key === 'R') && gameState === 'GAME_OVER') {
    startGame(); // Use startGame which includes a reset
  }
}

// ============================
// Classes
// ============================

class Astronaut {
  constructor() {
    this.w = 40;
    this.h = 60;
    this.reset(width / 4, groundY - this.h / 2); // Start position
  }

  reset(x, y) {
     this.pos = createVector(x, y);
     this.vel = createVector(0, 0);
     this.acc = createVector(0, 0);
     this.isGrounded = true;
     this.jumpCount = 0; // Reset double jump
  }

  applyForce(force) {
    this.acc.add(force);
  }

  applyGravity() {
    this.applyForce(createVector(0, GRAVITY));
  }

  jump() {
    if (this.isGrounded) {
      this.vel.y = JUMP_FORCE;
      this.isGrounded = false;
      this.jumpCount = 1; // First jump used
    } else if (this.jumpCount < 2) { // Allow double jump
      this.vel.y = DOUBLE_JUMP_FORCE;
      this.jumpCount = 2; // Second jump used
    }
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0); // Clear acceleration

    // Prevent falling through ground (simple check)
    // More robust check happens in checkGroundCollision
    if (this.pos.y + this.h / 2 > groundY) {
       this.pos.y = groundY - this.h / 2;
       this.vel.y = 0;
       this.isGrounded = true;
       this.jumpCount = 0; // Reset jumps on landing
    }
  }

  checkGroundCollision(gndY) {
     if (this.pos.y + this.h / 2 >= gndY && this.vel.y >= 0) { // Hit or crossed ground while falling
        this.pos.y = gndY - this.h / 2;
        this.vel.y = 0;
        if (!this.isGrounded) {
             // Landing effect (optional: could add small dust particles)
        }
        this.isGrounded = true;
        this.jumpCount = 0; // Reset jump count upon landing
    } else if (this.pos.y + this.h / 2 < gndY) {
         // Allow isGrounded to be set false by jumping, don't set it false here automatically
         // this.isGrounded = false; // This line caused issues, removed.
    }
  }


  display() {
    push();
    translate(this.pos.x, this.pos.y);

    // Simple Astronaut Body
    fill(0, 0, 90); // White suit
    stroke(0, 0, 20); // Dark outline
    strokeWeight(2);
    rectMode(CENTER);
    rect(0, 0, this.w * 0.8, this.h * 0.9, 5); // Body (slightly smaller, rounded)

    // Helmet
    fill(180, 30, 100, 70); // Light blue visor, semi-transparent
    ellipse(0, -this.h * 0.35, this.w * 0.7, this.w * 0.7); // Helmet glass
    fill(0, 0, 80); // Helmet rim
    noStroke();
    ellipse(0, -this.h * 0.35, this.w * 0.75, this.w * 0.75); // Back of helmet
     ellipse(0, -this.h * 0.35, this.w * 0.7, this.w * 0.7); // Helmet glass


    // Legs (simple animation based on vertical velocity)
    let legOffset = map(sin(frameCount * 0.3), -1, 1, -3, 3);
     if (!this.isGrounded) {
         legOffset = map(this.vel.y, -abs(JUMP_FORCE), GRAVITY * 5, -5, 5, true); // Tuck legs when jumping/falling fast
     }
    stroke(0, 0, 20);
    strokeWeight(5);
    line(-this.w * 0.2, this.h * 0.4, -this.w * 0.2 + legOffset, this.h * 0.5 + 5); // Left leg
    line( this.w * 0.2, this.h * 0.4,  this.w * 0.2 - legOffset, this.h * 0.5 + 5); // Right leg


    // Backpack
    fill(0, 0, 50); // Grey backpack
    rect(0, this.h * 0.1, this.w * 0.9, this.h * 0.5, 3);

    pop();
    rectMode(CORNER); // Reset rectMode
  }

  hits(obstacle) {
    // Simple Axis-Aligned Bounding Box (AABB) collision detection
    // Using rectMode(CENTER) for astronaut drawing, so adjust coords
    let astroLeft = this.pos.x - this.w / 2;
    let astroRight = this.pos.x + this.w / 2;
    let astroTop = this.pos.y - this.h / 2;
    let astroBottom = this.pos.y + this.h / 2;

    let obsLeft = obstacle.pos.x;
    let obsRight = obstacle.pos.x + obstacle.w;
    let obsTop = obstacle.pos.y;
    let obsBottom = obstacle.pos.y + obstacle.h;

    // Check for no collision first, then invert
    let noCollision =
      astroRight < obsLeft ||
      astroLeft > obsRight ||
      astroBottom < obsTop ||
      astroTop > obsBottom;

    return !noCollision;
  }
}

class Obstacle {
  constructor(x, y, w, h) {
    this.pos = createVector(x, y);
    this.w = w;
    this.h = h;
    // Randomly pick a crater-like or rock-like color
    this.hue = random(15, 35);
    this.saturation = random(60, 80);
    this.brightness = random(30, 50);
  }

  update(speed) {
    this.pos.x -= speed;
  }

  display() {
    fill(this.hue, this.saturation, this.brightness); // Use stored HSB values
    noStroke();
    // Draw slightly irregular rect
    beginShape();
    vertex(this.pos.x, this.pos.y);
    vertex(this.pos.x + this.w, this.pos.y + random(-2,2)); // Add slight irregularity
    vertex(this.pos.x + this.w + random(-2, 2), this.pos.y + this.h);
    vertex(this.pos.x + random(-2, 2), this.pos.y + this.h);
    endShape(CLOSE);

    // Add a subtle highlight/shadow
     fill(this.hue, this.saturation, this.brightness + 15, 50);
     rect(this.pos.x, this.pos.y, this.w, 5); // Top highlight
     fill(this.hue, this.saturation, this.brightness - 15, 50);
     rect(this.pos.x, this.pos.y + this.h - 5, this.w, 5); // Bottom shadow
  }

  isOffscreen() {
    return this.pos.x + this.w < 0;
  }
}

// --- Particle System ---
class Particle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        // Start with upward/outward velocity for jetpack burst
        this.vel = p5.Vector.random2D().mult(random(1, 4));
        this.vel.y += random(-1, -3); // Bias upwards slightly more strongly
        this.acc = createVector(0, 0.05); // Gentle gravity/drag
        this.lifespan = 100; // Alpha value
         this.size = random(3, 7);
         this.colorHue = random(180, 220); // Blue/Cyan flames
         this.colorSat = random(70, 100);
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.lifespan -= 2.5;
    }

    display() {
        noStroke();
        fill(this.colorHue, this.colorSat, 100, this.lifespan);
        ellipse(this.pos.x, this.pos.y, this.size, this.size);
    }

    isDead() {
        return this.lifespan <= 0;
    }
}

function createJetpackBurst(x, y) {
    let numParticles = 10; // Create a burst of particles
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(x, y));
    }
}


// --- Utility ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  groundY = height - GROUND_Y_OFFSET;
  // Re-center astronaut slightly if needed, though position is relative to screen edges mostly
   if (astronaut) {
       astronaut.pos.x = width / 4; // Keep astronaut horizontally fixed
       // Ensure astronaut isn't pushed off screen vertically by resize
       astronaut.pos.y = min(astronaut.pos.y, groundY - astronaut.h / 2);
   }
}