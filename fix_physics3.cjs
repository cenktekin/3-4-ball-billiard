const fs = require('fs');

let code = fs.readFileSync('js/physics.js', 'utf8');

const simulateTrajectoryRegex = /function simulateTrajectory[\s\S]*?return { cuePoints, hitPoints, hitBallId: hitBallRef \? hitBallRef\.id : null };\n  }/;

const newSimulateTrajectory = `function simulateTrajectory(startX, startY, angle, power, spinX, spinY, table, balls, maxSteps) {
    const cuePoints = [{ x: startX, y: startY, type: 'start' }];
    const hitPoints = [];
    
    let x = startX;
    let y = startY;
    let vx = Math.cos(angle) * power;
    let vy = Math.sin(angle) * power;
    let sx = spinX || 0;
    let sy = spinY || 0;
    
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
    
    // Keep track of which balls the cue ball has already hit recently
    // to prevent getting stuck in them
    let lastHitId = null;
    let framesSinceHit = 0;

    for (let step = 0; step < maxSteps; step++) {
      let moved = false;
      
      framesSinceHit++;
      if (framesSinceHit > 5) lastHitId = null;

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

      // Continuous Collision Detection - Raycast between previous frame and this frame
      // This solves the "tunneling/teğet geçme" issue where balls pass through each other
      let minT = Infinity;
      let ccdHitA = null;
      let ccdHitB = null;
      
      for (let i = 0; i < simBalls.length; i++) {
        for (let j = i + 1; j < simBalls.length; j++) {
          const a = simBalls[i];
          const b = simBalls[j];
          
          // Check standard discrete collision first
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;
          
          if (dist < minDist && dist > 0) {
            const involvesCue = (a === simCue || b === simCue);
            const target = a === simCue ? b : a;
            
            if (involvesCue && target.id !== lastHitId) {
              const collided = checkBallCollision(a, b);
              if (collided) {
                lastHitId = target.id;
                framesSinceHit = 0;
                
                if (!postCollision) hitBallRef = target;
                postCollision = true;
                
                cuePoints.push({ x: simCue.x, y: simCue.y, type: 'ball_hit', ballId: target.id });
                
                if (hitPoints.length === 0) {
                  hitPoints.push({ x: target.x, y: target.y, type: 'start' });
                }
              }
            } else if (!involvesCue) {
              checkBallCollision(a, b);
            }
          } else if (isMoving(a) || isMoving(b)) {
            // CCD Check if they didn't collide discretely but might have tunneled
            const relVx = a.vx - b.vx;
            const relVy = a.vy - b.vy;
            
            // Check if relative velocity is significant enough for tunneling
            if (Math.abs(relVx) + Math.abs(relVy) > 1.0) {
              // Roll back positions to start of frame
              const prevAx = a.x - a.vx * DT;
              const prevAy = a.y - a.vy * DT;
              const prevBx = b.x - b.vx * DT;
              const prevBy = b.y - b.vy * DT;
              
              const ocx = prevBx - prevAx;
              const ocy = prevBy - prevAy;
              
              const A = relVx * relVx + relVy * relVy;
              const B = -2 * (ocx * relVx + ocy * relVy);
              const C = ocx * ocx + ocy * ocy - minDist * minDist;
              
              const disc = B * B - 4 * A * C;
              
              if (disc >= 0) {
                const t = (-B - Math.sqrt(disc)) / (2 * A);
                if (t >= 0 && t <= DT && t < minT) {
                  const involvesCue = (a === simCue || b === simCue);
                  const target = a === simCue ? b : a;
                  
                  if (!involvesCue || target.id !== lastHitId) {
                    minT = t;
                    ccdHitA = a;
                    ccdHitB = b;
                  }
                }
              }
            }
          }
        }
      }
      
      // If we found a CCD hit (tunneling prevented)
      if (ccdHitA && ccdHitB && minT < Infinity) {
        const a = ccdHitA;
        const b = ccdHitB;
        
        // Rewind to collision point
        a.x = (a.x - a.vx * DT) + a.vx * minT;
        a.y = (a.y - a.vy * DT) + a.vy * minT;
        b.x = (b.x - b.vx * DT) + b.vx * minT;
        b.y = (b.y - b.vy * DT) + b.vy * minT;
        
        const involvesCue = (a === simCue || b === simCue);
        const target = a === simCue ? b : a;
        
        const collided = checkBallCollision(a, b);
        
        if (collided && involvesCue) {
          lastHitId = target.id;
          framesSinceHit = 0;
          
          if (!postCollision) hitBallRef = target;
          postCollision = true;
          
          cuePoints.push({ x: simCue.x, y: simCue.y, type: 'ball_hit', ballId: target.id });
          
          if (hitPoints.length === 0) {
            hitPoints.push({ x: target.x, y: target.y, type: 'start' });
          }
        }
        
        // Fast forward remaining frame time
        const remDT = DT - minT;
        a.x += a.vx * remDT;
        a.y += a.vy * remDT;
        b.x += b.vx * remDT;
        b.y += b.vy * remDT;
      }

      // Record trajectory path periodically
      if (step % 5 === 0 && isMoving(simCue)) {
        cuePoints.push({ x: simCue.x, y: simCue.y, type: 'path' });
      }
      
      if (hitBallRef && isMoving(hitBallRef) && step % 5 === 0) {
        hitPoints.push({ x: hitBallRef.x, y: hitBallRef.y, type: 'path' });
      }

      if (!moved) {
        cuePoints.push({ x: simCue.x, y: simCue.y, type: 'end' });
        if (hitBallRef) hitPoints.push({ x: hitBallRef.x, y: hitBallRef.y, type: 'end' });
        break;
      }
    }

    if (cuePoints[cuePoints.length - 1].type !== 'end' && cuePoints[cuePoints.length - 1].type !== 'ball_hit') {
      cuePoints.push({ x: simCue.x, y: simCue.y, type: 'end' });
    }

    return { cuePoints, hitPoints, hitBallId: hitBallRef ? hitBallRef.id : null };
  }`;

code = code.replace(simulateTrajectoryRegex, newSimulateTrajectory);
fs.writeFileSync('js/physics.js', code);
