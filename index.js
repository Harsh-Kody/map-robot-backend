const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const BOUNDARY = {
  minX: 73.88825541619121,
  maxX: 5069.783352337514,
  minY: 144.65222348916728,
  maxY: 3551.7673888255417,
};
const ROBOT_RADIUS = 250; // adjust based on your map scale
const MIN_DISTANCE = ROBOT_RADIUS * 2;

function avoidCollisions() {
  for (let i = 0; i < robots.length; i++) {
    for (let j = i + 1; j < robots.length; j++) {
      const r1 = robots[i];
      const r2 = robots[j];

      const dx = r2.x - r1.x;
      const dy = r2.y - r1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MIN_DISTANCE) {
        // Robot with higher index changes direction
        const changer = r2; 

        // Push away from r1
        const away = normalizeDirection({ dx, dy });
        changer.direction = normalizeDirection({
          dx: away.dx,
          dy: away.dy,
        });

        // Move slightly so they don't overlap
        changer.x += away.dx * changer.speed;
        changer.y += away.dy * changer.speed;
      }
    }
  }
}
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomDirection() {
  const angle = Math.random() * 2 * Math.PI;
  return { dx: Math.cos(angle), dy: Math.sin(angle) };
}

function normalizeDirection(dir) {
  const length = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
  return { dx: dir.dx / length, dy: dir.dy / length };
}

// Create 10 robots
let robots = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Robot-${i + 1}`,
  x: getRandom(BOUNDARY.minX, BOUNDARY.maxX),
  y: getRandom(BOUNDARY.minY, BOUNDARY.maxY),
  speed: 15,
  direction: normalizeDirection(getRandomDirection()),
}));

function moveRobot(robot) {
  robot.x += robot.direction.dx * robot.speed;
  robot.y += robot.direction.dy * robot.speed;

  let bounced = false;

  if (robot.x < BOUNDARY.minX) {
    robot.x = BOUNDARY.minX;
    robot.direction.dx *= -1;
    bounced = true;
  }
  if (robot.x > BOUNDARY.maxX) {
    robot.x = BOUNDARY.maxX;
    robot.direction.dx *= -1;
    bounced = true;
  }
  if (robot.y < BOUNDARY.minY) {
    robot.y = BOUNDARY.minY;
    robot.direction.dy *= -1;
    bounced = true;
  }
  if (robot.y > BOUNDARY.maxY) {
    robot.y = BOUNDARY.maxY;
    robot.direction.dy *= -1;
    bounced = true;
  }

  if (bounced) {
    const angleJitter = (Math.random() - 0.5) * 0.4;
    const cos = Math.cos(angleJitter);
    const sin = Math.sin(angleJitter);

    const dx = robot.direction.dx * cos - robot.direction.dy * sin;
    const dy = robot.direction.dx * sin + robot.direction.dy * cos;

    robot.direction = normalizeDirection({ dx, dy });
  }
}

function tick() {
  robots.forEach((robot) => moveRobot(robot));
    avoidCollisions();
  io.emit("robot_update", robots); // send all robots at once
}

setInterval(tick, 50);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
