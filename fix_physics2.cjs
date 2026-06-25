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
    
    // Target ball state after collision
    let tx = 0, ty = 0, tvx = 0, tvy = 0, tsx = 0, tsy = 0;

    const r = BALL_RADIUS;
    const left = table.x + r;
    const right = table.x + table.width - r;
    const top = table.y + r;
    const bottom = table.y + table.height - r;
    
    const DT = 1.0;
    const MIN_V = MIN_VELOCITY;
    const FRIC = FRICTION;
    const SPIN_DEC = SPIN_DECAY;
    const CUSHION_REST = WALL_RESTITUTION;
    const SPIN_CUSH = SPIN_CUSHION_EFFECT;

    for (let step = 0; step < maxSteps; step++) {
      let ballHit = null;
      let minT = Infinity;

      // 1. Continuous Collision Detection (CCD) for Ball Hits
      if (!postCollision) {
        for (const ball of balls) {
          if (!ball.active) continue;
          
          const ocx = ball.x - x;
          const ocy = ball.y - y;
          const rSum = r + ball.radius;
          const a = vx * vx + vy * vy;
          
          if (a < 0.001) continue;
          
          const b = -2 * (ocx * vx + ocy * vy);
          const c = ocx * ocx + ocy * ocy - rSum * rSum;
          const disc = b * b - 4 * a * c;
          
          if (disc >= 0) {
            const t = (-b - Math.sqrt(disc)) / (2 * a);
            // Must be moving towards it (t > 0) and hit within this frame (t <= DT)
            if (t >= 0 && t <= DT && t < minT) {
              minT = t;
              ballHit = ball;
            }
          }
        }
      }

      // 2. Handle Ball Collision via Exact Engine Math
      if (ballHit && !postCollision) {
        // Move to collision point
        x = x + vx * minT;
        y = y + vy * minT;
        
        cuePoints.push({ x, y, type: 'ball_hit', ballId: ballHit.id });
        hitPoints.push({ x: ballHit.x, y: ballHit.y, type: 'start' });
        
        hitBallRef = ballHit;
        postCollision = true;
        
        // Exact impulse logic from checkBallCollision
        const dx = ballHit.x - x;
        const dy = ballHit.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const nx = dx / dist;
        const ny = dy / dist;
        
        const dvn = vx * nx + vy * ny;
        
        if (dvn > 0) {
          const impulse = dvn * (1 + RESTITUTION) / 2;
          
          vx -= impulse * nx;
          vy -= impulse * ny;
          
          // Target ball velocity
          tvx = impulse * nx;
          tvy = impulse * ny;
          tx = ballHit.x;
          ty = ballHit.y;
          
          // Exact spin logic from checkBallCollision
          if (sx !== 0 || sy !== 0) {
            const tanX = -ny;
            const tanY = nx;
            const along = sx * tanX + sy * tanY;
            
            vx += tanX * along * SPIN_COLLISION_EFFECT;
            vy += tanY * along * SPIN_COLLISION_EFFECT;

            const shotSpeed = Math.sqrt(vx * vx + vy * vy);
            const shotAngle = Math.atan2(vy, vx);
            const spinForward = -sy;
            const forwardMod = spinForward * SPIN_COLLISION_EFFECT * shotSpeed * 0.6;
            
            vx = Math.cos(shotAngle) * (shotSpeed + forwardMod);
            vy = Math.sin(shotAngle) * (shotSpeed + forwardMod);
            
            tsx = sx * 0.4;
            tsy = sy * 0.4;
          }
        }
        
        // Consume remaining DT time for this frame
        const remDT = DT - minT;
        x += vx * remDT;
        y += vy * remDT;
        tx += tvx * remDT;
        ty += tvy * remDT;
      } else {
        // Normal Move (no ball collision this frame)
        vx *= FRIC;
        vy *= FRIC;
        sx *= SPIN_DEC;
        sy *= SPIN_DEC;
        if (sx !== 0) vx += sx * SPIN_CUSH * 0.05;
        if (sy !== 0) vy += sy * SPIN_CUSH * 0.05;
        
        x += vx * DT;
        y += vy * DT;
        
        if (postCollision) {
          tvx *= FRIC;
          tvy *= FRIC;
          tsx *= SPIN_DEC;
          tsy *= SPIN_DEC;
          if (tsx !== 0) tvx += tsx * SPIN_CUSH * 0.05;
          if (tsy !== 0) tvy += tsy * SPIN_CUSH * 0.05;
          
          tx += tvx * DT;
          ty += tvy * DT;
        }
      }

      // 3. Cushion Collisions
      let cushHit = false;
      if (x < left) { x = left; vx = Math.abs(vx) * CUSHION_REST; cushHit = true; }
      else if (x > right) { x = right; vx = -Math.abs(vx) * CUSHION_REST; cushHit = true; }
      if (y < top) { y = top; vy = Math.abs(vy) * CUSHION_REST; cushHit = true; }
      else if (y > bottom) { y = bottom; vy = -Math.abs(vy) * CUSHION_REST; cushHit = true; }
      
      if (cushHit) cuePoints.push({ x, y, type: 'cushion' });

      if (postCollision) {
        let tCushHit = false;
        if (tx < left) { tx = left; tvx = Math.abs(tvx) * CUSHION_REST; tCushHit = true; }
        else if (tx > right) { tx = right; tvx = -Math.abs(tvx) * CUSHION_REST; tCushHit = true; }
        if (ty < top) { ty = top; tvy = Math.abs(tvy) * CUSHION_REST; tCushHit = true; }
        else if (ty > bottom) { ty = bottom; tvy = -Math.abs(tvy) * CUSHION_REST; tCushHit = true; }
        
        if (tCushHit) hitPoints.push({ x: tx, y: ty, type: 'cushion' });
      }

      // Record path
      if (step % 4 === 0) {
        cuePoints.push({ x, y, type: 'path' });
        if (postCollision && (Math.abs(tvx) + Math.abs(tvy) > MIN_V)) {
          hitPoints.push({ x: tx, y: ty, type: 'path' });
        }
      }

      // Break if both stopped
      const cueStopped = Math.abs(vx) + Math.abs(vy) < MIN_V;
      const targetStopped = !postCollision || (Math.abs(tvx) + Math.abs(tvy) < MIN_V);

      if (cueStopped && targetStopped) {
        if (cueStopped) cuePoints.push({ x, y, type: 'end' });
        if (postCollision && targetStopped) hitPoints.push({ x: tx, y: ty, type: 'end' });
        break;
      }
    }

    if (cuePoints[cuePoints.length - 1].type !== 'end' && cuePoints[cuePoints.length - 1].type !== 'ball_hit') {
      cuePoints.push({ x, y, type: 'end' });
    }
    if (postCollision && hitPoints.length > 0 && hitPoints[hitPoints.length - 1].type !== 'end') {
      hitPoints.push({ x: tx, y: ty, type: 'end' });
    }

    return { cuePoints, hitPoints, hitBallId: hitBallRef ? hitBallRef.id : null };
  }`;

code = code.replace(simulateTrajectoryRegex, newSimulateTrajectory);
fs.writeFileSync('js/physics.js', code);
