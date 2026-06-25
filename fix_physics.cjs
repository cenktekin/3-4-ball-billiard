const fs = require('fs');

let code = fs.readFileSync('js/physics.js', 'utf8');

const simulateTrajectoryRegex = /function simulateTrajectory[\s\S]*?return { cuePoints, hitPoints, hitBallId: hitBallRef \? hitBallRef\.id : null };\n  }/;

const newSimulateTrajectory = `function simulateTrajectory(startX, startY, angle, power, spinX, spinY, table, balls, maxSteps) {
    const cuePoints = [{ x: startX, y: startY, type: 'start' }];
    const hitPoints = [];
    let hitBallRef = null;
    let postCollision = false;

    // Create a deep copy of the active balls for the simulation
    const simBalls = balls.filter(b => b.active).map(b => ({
      id: b.id, 
      x: b.x, 
      y: b.y, 
      vx: 0, 
      vy: 0, 
      spinX: 0, 
      spinY: 0, 
      radius: b.radius, 
      active: true
    }));
    
    // Find the virtual cue ball
    let simCue = simBalls.find(b => Math.abs(b.x - startX) < 1 && Math.abs(b.y - startY) < 1);
    if (!simCue) {
      simCue = { id: 'cue_temp', x: startX, y: startY, vx: 0, vy: 0, spinX: 0, spinY: 0, radius: BALL_RADIUS, active: true };
      simBalls.push(simCue);
    }

    // Apply the initial shot to the virtual cue ball
    applyShot(simCue, angle, power, spinX, spinY);

    const DT = 1.0;

    for (let step = 0; step < maxSteps; step++) {
      let moved = false;

      // 1. Move & Cushion Collisions (Exactly like main game loop)
      for (const ball of simBalls) {
        if (isMoving(ball)) {
          moved = true;
          applyFriction(ball);
          applySpinDecay(ball);
          moveBall(ball, DT);
          const cushHit = checkCushionCollision(ball, table);
          
          if (cushHit && ball === simCue) {
            cuePoints.push({ x: ball.x, y: ball.y, type: 'cushion' });
          }
        }
      }

      // 2. Ball-to-Ball Collisions (Exactly like main game loop)
      for (let i = 0; i < simBalls.length; i++) {
        for (let j = i + 1; j < simBalls.length; j++) {
          const involvesCue = (simBalls[i] === simCue || simBalls[j] === simCue);
          const target = simBalls[i] === simCue ? simBalls[j] : simBalls[i];

          const collided = checkBallCollision(simBalls[i], simBalls[j]);
          
          if (collided && involvesCue && !postCollision) {
            postCollision = true;
            hitBallRef = target;
            cuePoints.push({ x: simCue.x, y: simCue.y, type: 'ball_hit', ballId: target.id });
          }
        }
      }

      // Record trajectory path periodically
      if (postCollision && step % 3 === 0 && isMoving(simCue)) {
        cuePoints.push({ x: simCue.x, y: simCue.y, type: 'path' });
      }

      if (!moved) {
        cuePoints.push({ x: simCue.x, y: simCue.y, type: 'end' });
        break;
      }
    }

    if (cuePoints[cuePoints.length - 1].type !== 'end' && cuePoints[cuePoints.length - 1].type !== 'ball_hit') {
      cuePoints.push({ x: simCue.x, y: simCue.y, type: 'end' });
    }

    return { cuePoints, hitPoints: [], hitBallId: hitBallRef ? hitBallRef.id : null };
  }`;

code = code.replace(simulateTrajectoryRegex, newSimulateTrajectory);
fs.writeFileSync('js/physics.js', code);
