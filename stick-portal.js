/*
Released under MIT License
Copyright (C) 2012, Greg Linden (glinden@gmail.com)

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var Box, Bullet, EditWheel, Exit, GameObj, JumpPlate, Man, Physics, Platform, Portal, PortalableGameObj, Turret, Wall, World, after, arrowKeys, b2AABB, b2Body, b2BodyDef, b2CircleShape, b2DebugDraw, b2DistanceJointDef, b2Fixture, b2FixtureDef, b2MassData, b2PolygonShape, b2Vec2, b2World, ctx, escKey, every, frameRate, handleDeviceOrientation, handleKeyDown, handleKeyUp, handleMouseDown, handleMouseMove, handleOrientationChange, handleTouchEnd, handleTouchMove, handleTouchStart, handleTouchStartOrEndMethod1Helper, initGamePlayDemo, modifierKeys, randomInt, stickManTryToJumpForNumFrames, touchControlUI, updateWorld, virtualCanvasHeight, virtualCanvasWidth, wasdKeys, world, _ref, _ref2,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
  __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

GameObj = (function() {

  function GameObj(left, top, width, height, angle) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    this.angle = angle != null ? angle : 0;
  }

  GameObj.prototype.distance = function(otherObj) {
    var x, x2, y, y2;
    x = this.left + this.width / 2;
    y = this.top + this.height / 2;
    x2 = otherObj.left + otherObj.width / 2;
    y2 = otherObj.top + otherObj.height / 2;
    return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
  };

  GameObj.prototype.draw = function(ctx) {};

  GameObj.prototype.update = function() {
    if (this.physicsBody) return world.physics.updateGameObjPosition(this);
  };

  return GameObj;

})();

PortalableGameObj = (function(_super) {
  var beingPortaledMaxFrames, justPortaledFramesWait;

  __extends(PortalableGameObj, _super);

  beingPortaledMaxFrames = 4;

  justPortaledFramesWait = 15;

  function PortalableGameObj(left, top, width, height, angle) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    this.angle = angle != null ? angle : 0;
    PortalableGameObj.__super__.constructor.call(this, this.left, this.top, this.width, this.height, this.angle);
    this.canBePortaled = true;
  }

  PortalableGameObj.prototype.draw = function(ctx) {
    var absBeingPortaled, atPortal, color, radgrad, radsize, size;
    if (this.beingPortaled) {
      ctx.save();
      ctx.translate(this.left, this.top);
      radsize = Math.min(this.width / 2, this.height / 2);
      radgrad = ctx.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, radsize);
      size = .4;
      color = 'rgba(0,0,0,0.5)';
      absBeingPortaled = Math.abs(this.beingPortaled);
      atPortal = this.gotoPortal;
      if (this.beingPortaled > 0) atPortal = this.fromPortal;
      if (absBeingPortaled === 2) {
        size = .2;
      } else if (absBeingPortaled > 2) {
        if (atPortal.isBlue) {
          color = 'rgba(122,152,255,.9)';
        } else {
          color = 'rgba(255,185,15,.9)';
        }
        size = .1 + (absBeingPortaled - 2) * .4 / (beingPortaledMaxFrames - 2);
      }
      radgrad.addColorStop(size - .1, 'rgba(255,255,255,0)');
      radgrad.addColorStop(size, color);
      radgrad.addColorStop(size + .1, 'rgba(255,255,255,0)');
      ctx.fillStyle = radgrad;
      ctx.fillRect(0, 0, this.width, this.height);
      return ctx.restore();
    }
  };

  PortalableGameObj.prototype.update = function() {
    var modY, newX, newY, velocityVec;
    if (this.beingPortaled) {
      if (this.beingPortaled >= beingPortaledMaxFrames) {
        this.beingPortaled = -this.beingPortaled;
        newX = this.gotoPortal.centerX / world.physics.scale;
        newY = this.gotoPortal.centerY / world.physics.scale;
        modY = (this.height / 2 + this.gotoPortal.height) / world.physics.scale;
        if (this.gotoPortal.onTop) {
          newY -= modY;
        } else {
          newY += modY;
        }
        this.physicsBody.SetPosition(new b2Vec2(newX, newY));
        world.physics.updateGameObjPosition(this);
        if (this.fromPortal.onTop === this.gotoPortal.onTop) {
          velocityVec = this.physicsBody.GetLinearVelocity();
          velocityVec.Set(velocityVec.x, -velocityVec.y);
          this.physicsBody.SetLinearVelocity(velocityVec);
        }
      } else {
        this.beingPortaled++;
      }
      if (!this.beingPortaled) {
        this.gotoPortal = null;
        this.fromPortal = null;
        this.justPortaled = justPortaledFramesWait;
        if (!this.exiting) this.physicsBody.SetActive(true);
      }
    }
    if (this.justPortaled) this.justPortaled--;
    return PortalableGameObj.__super__.update.call(this);
  };

  return PortalableGameObj;

})(GameObj);

Man = (function(_super) {
  var maxHoldDistance;

  __extends(Man, _super);

  Man.prototype.legPos = {
    pass: 3,
    up: 2,
    contact: 1,
    V: 0
  };

  maxHoldDistance = 100;

  function Man(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width != null ? width : 50;
    this.height = height != null ? height : 50;
    Man.__super__.constructor.call(this, this.left, this.top, this.width, this.height);
    this.legs = this.legPos.V;
    this.facing = 0;
    this.running = false;
    this.jumping = 0;
    this.armAngle = 0;
    this.fixedRotation = true;
  }

  Man.prototype.update = function() {
    var deltaVx, downForce, ix, iy, jumpSpeed, maxVx, newVx, runningSpeed, someBody, vx, vy, x, y, _ref, _ref2;
    if (this.beingPortaled || this.exiting) return Man.__super__.update.call(this);
    if (this.touchedDuration) this.touchedDuration++;
    x = world.mouseX - (this.left + this.width / 2);
    y = world.mouseY - (this.top + this.height / 2);
    this.armAngle = Math.atan2(y, x);
    runningSpeed = 6;
    jumpSpeed = 8;
    vx = this.physicsBody.GetLinearVelocity().x;
    vy = this.physicsBody.GetLinearVelocity().y;
    if ((someBody = this.somethingUnderfoot())) {
      if (this.jumping && (Math.abs(vy) < jumpSpeed * .2)) {
        this.physicsBody.ApplyImpulse(new b2Vec2(0, -jumpSpeed * this.physicsBody.GetMass()), new b2Vec2(this.physicsBody.GetPosition().x, this.physicsBody.GetPosition().y));
        if (someBody.canBePickedUp) {
          downForce = someBody.physicsBody.GetMass() * jumpSpeed * .5;
          someBody.physicsBody.ApplyImpulse(new b2Vec2(0, downForce), new b2Vec2(this.physicsBody.GetPosition().x, someBody.physicsBody.GetPosition().y));
          this.jumping = 0;
          if (this.heldObj && someBody === this.heldObj) {
            world.physics.releaseStickmanHeldObj(this, this.heldObj);
            world.mouseDown = false;
          }
        }
      } else if (this.running) {
        maxVx = runningSpeed * this.facing;
        deltaVx = maxVx * .3;
        newVx = vx + deltaVx;
        if (Math.abs(newVx) > Math.abs(maxVx)) {
          if (Math.abs(vx) > Math.abs(maxVx)) {
            if (Math.abs(newVx) > Math.abs(vx)) newVx = vx;
          } else {
            newVx = maxVx;
          }
        }
        this.physicsBody.SetLinearVelocity(new b2Vec2(newVx, vy));
      }
    } else if (Math.abs(this.left - this.leftAve) < .2 && Math.abs(this.top - this.topAve) < .2) {
      if (this.jumping || this.running) {
        ix = 0;
        if (this.running) {
          ix = runningSpeed * .3 * this.facing * this.physicsBody.GetMass();
        }
        iy = 0;
        if (this.jumping) {
          iy = jumpSpeed * -.3 * this.physicsBody.GetMass();
          this.jumping = 0;
        }
        this.physicsBody.ApplyImpulse(new b2Vec2(ix, iy), new b2Vec2(this.physicsBody.GetPosition().x, this.physicsBody.GetPosition().y));
      } else {
        this.physicsBody.ApplyImpulse(new b2Vec2(0, .2 * jumpSpeed * this.physicsBody.GetMass()), new b2Vec2(this.physicsBody.GetPosition().x, this.physicsBody.GetPosition().y));
      }
    } else if (this.running) {
      maxVx = runningSpeed * this.facing;
      deltaVx = maxVx * .05;
      newVx = vx + deltaVx;
      if (Math.abs(newVx) > Math.abs(maxVx)) {
        if (Math.abs(vx) > Math.abs(maxVx)) {
          if (Math.abs(newVx) > Math.abs(vx)) newVx = vx;
        } else {
          newVx = maxVx;
        }
      }
      this.physicsBody.SetLinearVelocity(new b2Vec2(newVx, vy));
    }
    this.leftAve = ((_ref = this.leftAve) != null ? _ref : 0) * .9 + this.left * .1;
    this.topAve = ((_ref2 = this.topAve) != null ? _ref2 : 0) * .9 + this.top * .1;
    if (this.jumping > 0) this.jumping--;
    this.updateLegs();
    if (world.mouseDown) {
      if (this.heldObj) {
        if (this.heldObj) world.physics.releaseStickmanHeldObj(this, this.heldObj);
      } else {
        this.heldObj = world.physics.findObjToPickup(this);
        if (this.heldObj) {
          if (this.heldObj) {
            world.physics.attachStickmanHeldObj(this, this.heldObj);
          }
          this.lastArmAngle = this.armAngle;
        } else {
          this.shootPortal();
        }
      }
      world.mouseDown = false;
    } else if (this.heldObj) {
      if (this.distance(this.heldObj) > maxHoldDistance) {
        world.physics.releaseStickmanHeldObj(this, this.heldObj);
      } else if (Math.abs(this.armAngle - this.lastArmAngle) > .1) {
        world.physics.updateStickmanHeldObj(this, this.heldObj);
        this.lastArmAngle = this.armAngle;
      }
    }
    return Man.__super__.update.call(this);
  };

  Man.prototype.somethingUnderfoot = function() {
    var end, hitBody, hitFixture, rayLength, start;
    rayLength = .6 * this.width / world.physics.scale;
    start = this.physicsBody.GetPosition();
    end = new b2Vec2(rayLength * -.3, rayLength);
    end.Add(start);
    hitFixture = world.physics.physicsWorld.RayCastOne(start, end);
    hitBody = hitFixture != null ? hitFixture.GetBody() : void 0;
    if (hitBody) return hitBody.GetUserData();
    end = new b2Vec2(rayLength * .3, rayLength);
    end.Add(start);
    hitFixture = world.physics.physicsWorld.RayCastOne(start, end);
    hitBody = hitFixture != null ? hitFixture.GetBody() : void 0;
    return hitBody != null ? hitBody.GetUserData() : void 0;
  };

  Man.prototype.shootPortal = function() {
    var centerX, centerY, isBlue, x;
    isBlue = true;
    if (((function() {
      var _i, _len, _ref, _results;
      _ref = world.portals;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        if (x.isBlue) _results.push(x);
      }
      return _results;
    })()).length && (this.shootOrangeNext || !((function() {
      var _i, _len, _ref, _results;
      _ref = world.portals;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        if (!x.isBlue) _results.push(x);
      }
      return _results;
    })()).length)) {
      isBlue = false;
    }
    world.portals = (function() {
      var _i, _len, _ref, _results;
      _ref = world.portals;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        if (x.isBlue !== isBlue) _results.push(x);
      }
      return _results;
    })();
    centerX = this.left + this.width / 2 + Math.cos(this.armAngle) * this.width / 2;
    centerY = this.top + this.height / 2 + Math.sin(this.armAngle) * this.width / 2;
    world.portals.push(new Portal(centerX, centerY, this.armAngle, isBlue));
    return this.shootOrangeNext = isBlue;
  };

  Man.prototype.updateLegs = function() {
    if (this.legFrameWait >= 1) {
      this.legFrameWait--;
      return;
    } else {
      this.legFrameWait = frameRate / 15;
    }
    if (this.legs > 1) {
      return this.legs--;
    } else if (this.running) {
      return this.legs = this.legPos.pass;
    } else if (this.legs === 1) {
      return this.legs--;
    }
  };

  Man.prototype.draw = function(ctx) {
    var centerX, centerY, glowStartX, glowWidth, lingrad;
    if (this.beingPortaled) return Man.__super__.draw.call(this, ctx);
    centerX = this.left + this.width / 2;
    centerY = this.top + this.height / 2;
    ctx.beginPath();
    ctx.arc(centerX, this.top + this.height * .25, this.height * .20, 0, Math.PI * 2);
    ctx.moveTo(centerX, this.top + this.height * .45);
    ctx.lineTo(centerX, this.top + this.height * .75);
    switch (this.legs) {
      case this.legPos.pass:
        ctx.lineTo(centerX + this.facing * this.width / 12, this.top + this.height * .88);
        ctx.lineTo(centerX - this.facing * this.width / 14, this.top + this.height * .90);
        ctx.moveTo(centerX, this.top + this.height * .75);
        ctx.lineTo(centerX - this.facing * this.width / 30, this.top + this.height);
        break;
      case this.legPos.up:
        ctx.lineTo(centerX + this.facing * this.width / 9, this.top + this.height * .85);
        ctx.lineTo(centerX, this.top + this.height * .95);
        ctx.moveTo(centerX, this.top + this.height * .75);
        ctx.lineTo(centerX - this.facing * this.width / 10, this.top + this.height);
        break;
      case this.legPos.contact:
        ctx.lineTo(centerX - this.facing * this.width / 18, this.top + this.height * 7 / 8);
        ctx.lineTo(centerX - this.facing * this.width / 6, this.top + this.height);
        ctx.moveTo(centerX, this.top + this.height * .75);
        ctx.lineTo(centerX + this.facing * this.width / 7, this.top + this.height);
        break;
      default:
        ctx.lineTo(centerX - this.width / 8, this.top + this.height);
        ctx.moveTo(centerX, this.top + this.height * .75);
        ctx.lineTo(centerX + this.width / 8, this.top + this.height);
    }
    ctx.save();
    ctx.translate(centerX, this.top + this.height * .50);
    if (Math.abs(this.armAngle) > Math.PI * .5) {
      ctx.scale(-1, 1);
      ctx.rotate(-this.armAngle + Math.PI);
    } else {
      ctx.rotate(this.armAngle);
    }
    ctx.moveTo(0, 0);
    ctx.lineTo(this.width * .22, this.height * .02);
    ctx.moveTo(0, 0);
    ctx.lineTo(this.width * .23, this.height * .05);
    ctx.save();
    ctx.translate(this.width * .30, this.height * .03);
    ctx.scale(1, 0.5);
    ctx.moveTo(this.width * .08, 0);
    ctx.arc(0, 0, this.width * .08, 0, Math.PI * 2);
    ctx.restore();
    ctx.moveTo(this.width * .38, this.height * .03);
    ctx.lineTo(this.width * .40, this.height * .00);
    ctx.moveTo(this.width * .38, this.height * .03);
    ctx.lineTo(this.width * .40, this.height * .06);
    if (this.heldObj) {
      ctx.save();
      glowStartX = this.width * .42;
      glowWidth = this.width * .12;
      lingrad = ctx.createLinearGradient(glowStartX, 0, glowStartX + glowWidth, 0);
      lingrad.addColorStop(0, 'rgba(255,255,255,0)');
      lingrad.addColorStop(0.5, 'rgba(122,152,255,1)');
      lingrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lingrad;
      ctx.fillRect(glowStartX, -this.height * .02, glowWidth, this.height * 0.10);
      ctx.restore();
    }
    ctx.restore();
    return ctx.stroke();
  };

  return Man;

})(PortalableGameObj);

Exit = (function(_super) {
  var maxExitAnimationFrames;

  __extends(Exit, _super);

  maxExitAnimationFrames = 25;

  function Exit(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width != null ? width : 25;
    this.height = height != null ? height : 40;
    Exit.__super__.constructor.call(this, this.left, this.top, this.width, this.height);
    this.triggered = false;
    this.fixedRotation = true;
  }

  Exit.prototype.draw = function(ctx) {
    var centerX, centerY, radgrad, radsize;
    if (this.exiting) {
      centerX = this.left + this.width / 2;
      centerY = this.top + this.height / 2;
      radsize = Math.max(this.width / 2, this.height / 2) * (1 + Math.abs((this.exiting % 10) - 2 * (this.exiting % 5)) / 5);
      radgrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radsize);
      radgrad.addColorStop(0, 'rgba(255,255,255,0)');
      radgrad.addColorStop(.7, 'rgba(255,210,0,.5)');
      radgrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.fillStyle = radgrad;
      ctx.fillRect(this.left - radsize * 2, this.top - radsize * 2, this.width + radsize * 4, this.height + radsize * 4);
      ctx.restore();
    }
    ctx.save();
    if (!this.exiting) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#FFD700";
    }
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(this.left + 5, this.top + 5, this.width - 10, this.height - 10);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "#444444";
    ctx.strokeRect(this.left + 5, this.top + 5, this.width - 10, this.height - 10);
    return ctx.restore();
  };

  Exit.prototype.update = function() {
    var centerX, centerY, man, manCenterX, manCenterY;
    if (this.exiting) {
      this.exiting++;
      if (this.exiting > maxExitAnimationFrames) world.resetOnNextUpdate = true;
      return;
    }
    man = world.stickMan;
    centerX = this.left + this.width / 2;
    manCenterX = man.left + man.width / 2;
    if (Math.abs(manCenterX - centerX) < this.width * .7) {
      centerY = this.top + this.height / 2;
      manCenterY = man.top + man.height / 2;
      if (Math.abs(manCenterY - centerY) < this.height * .7) {
        man.exiting = true;
        man.physicsBody.SetActive(false);
        return this.exiting = 1;
      }
    }
  };

  return Exit;

})(GameObj);

Box = (function(_super) {

  __extends(Box, _super);

  function Box(left, top, angle, width, height) {
    this.left = left;
    this.top = top;
    this.angle = angle != null ? angle : 0;
    this.width = width != null ? width : 30;
    this.height = height != null ? height : 30;
    Box.__super__.constructor.call(this, this.left, this.top, this.width, this.height, this.angle);
    this.canBePickedUp = true;
  }

  Box.prototype.draw = function(ctx) {
    var centerX, centerY;
    if (this.beingPortaled) return Box.__super__.draw.call(this, ctx);
    centerX = this.left + this.width / 2;
    centerY = this.top + this.height / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    return ctx.restore();
  };

  return Box;

})(PortalableGameObj);

Bullet = (function(_super) {

  __extends(Bullet, _super);

  function Bullet(centerX, centerY, facing) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.facing = facing;
    this.angle = 0;
    this.width = 2;
    this.height = 2;
    this.velocity = 25 * this.facing;
    this.left = this.centerX - this.width / 2;
    this.top = this.centerY - this.height / 2;
    this.fixedRotation = true;
    this.life = frameRate / 4;
  }

  Bullet.prototype.draw = function(ctx) {
    return ctx.fillRect(this.left, this.top, this.width, this.height);
  };

  Bullet.prototype.update = function() {
    Bullet.__super__.update.apply(this, arguments);
    this.life--;
    if (this.life <= 0) return this.destroySelf();
  };

  Bullet.prototype.destroySelf = function() {
    world.bullets.remove(this);
    return world.physics.physicsWorld.DestroyBody(this.physicsBody);
  };

  return Bullet;

})(GameObj);

Turret = (function(_super) {
  var shotsPerSecond;

  __extends(Turret, _super);

  shotsPerSecond = 5;

  function Turret(left, top, facing, width, height) {
    this.left = left;
    this.top = top;
    this.facing = facing != null ? facing : -1;
    this.width = width != null ? width : 15;
    this.height = height != null ? height : 30;
    Turret.__super__.constructor.call(this, this.left, this.top, this.width, this.height);
    this.firing = 0;
    this.angle = 0;
    this.shotsFired = 0;
    this.canBePickedUp = true;
  }

  Turret.prototype.update = function() {
    var angle, b, target, x;
    Turret.__super__.update.apply(this, arguments);
    if (this.beingPortaled) return;
    if (this.shotsFired > shotsPerSecond * 20) {
      this.shotsFired = 0;
      this.reloading = frameRate * 4;
    }
    if (this.reloading) {
      this.reloading--;
      if (this.reloading < 0) this.reloading = 0;
      return;
    }
    angle = Math.abs(this.angle) % (Math.PI * 2);
    if (((angle > Math.PI * 2 - .1) || (angle < .1)) && !this.firing && this !== world.stickMan.heldObj) {
      target = this.lookForTarget();
      if (target === world.stickMan) {
        x = this.left;
        if (this.facing > 0) x += this.width;
        b = new Bullet(x, this.top + this.height * .2, this.facing);
        world.bullets.push(b);
        world.physics.addGameObj(b);
        world.physics.scaleMass(b, 2000);
        b.physicsBody.GetFixtureList().SetRestitution(0);
        b.physicsBody.SetLinearVelocity(new b2Vec2(b.velocity, 0));
        b.physicsBody.SetBullet(true);
        this.shotsFired++;
        this.firing = frameRate / shotsPerSecond;
      }
    }
    if (this.firing > 0) this.firing--;
    if (this.firing < 0) return this.firing = 0;
  };

  Turret.prototype.lookForTarget = function() {
    var centerX, centerY, end, hitBody, hitFixture, rayLength, start;
    centerX = this.left + this.width / 2;
    centerY = this.top + this.height / 3;
    rayLength = 10 * this.width / world.physics.scale;
    start = new b2Vec2(centerX / world.physics.scale, centerY / world.physics.scale);
    end = new b2Vec2(this.facing * rayLength, 0);
    end.Add(start);
    hitFixture = world.physics.physicsWorld.RayCastOne(start, end);
    hitBody = hitFixture != null ? hitFixture.GetBody() : void 0;
    return hitBody != null ? hitBody.GetUserData() : void 0;
  };

  Turret.prototype.draw = function(ctx) {
    var centerX, centerY;
    if (this.beingPortaled) return Turret.__super__.draw.call(this, ctx);
    centerX = this.left + this.width / 2;
    centerY = this.top + this.height / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(0, this.height * .1);
    ctx.lineTo(-.4 * this.width, this.height * .5);
    ctx.moveTo(0, this.height * .1);
    ctx.lineTo(.4 * this.width, this.height * .5);
    ctx.moveTo(0, -.3 * this.height);
    ctx.lineTo(this.facing * this.width * .5, -.3 * this.height);
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -.1 * this.height);
    ctx.scale(.5, 1);
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(0, 0, Math.min(this.width, this.height * .39), 0, Math.PI * 2, false);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return ctx.restore();
  };

  return Turret;

})(PortalableGameObj);

JumpPlate = (function(_super) {

  __extends(JumpPlate, _super);

  JumpPlate.prototype.drawHeight = 5;

  function JumpPlate(left, bottom, facing, width) {
    this.left = left;
    this.bottom = bottom;
    this.facing = facing != null ? facing : -1;
    this.width = width != null ? width : 15;
    this.height = 1;
    this.top = this.bottom - this.height;
    this.triggered = false;
    this.fixedRotation = true;
    this.angle = this.lastAngle = 0;
  }

  JumpPlate.prototype.update = function() {
    var jumpPlateSpeed, launchForce, oldAngle, someBody;
    oldAngle = this.angle;
    if (this.triggered) {
      if (!this.angle || this.lastAngle < this.angle) {
        this.angle += Math.PI / 9;
      } else {
        this.angle -= Math.PI / 19;
      }
    } else {
      if ((someBody = this.somethingAbove())) {
        jumpPlateSpeed = 18;
        if ((someBody === world.stickMan) || someBody.canBePickedUp) {
          this.triggered = true;
          launchForce = jumpPlateSpeed * someBody.physicsBody.GetMass();
          someBody.physicsBody.ApplyImpulse(new b2Vec2(this.facing * launchForce, -launchForce), new b2Vec2(someBody.physicsBody.GetPosition().x, someBody.physicsBody.GetPosition().y));
        }
      }
    }
    this.lastAngle = oldAngle;
    if (this.angle >= Math.PI / 2) this.angle = this.lastAngle = Math.PI / 2;
    if (this.angle < 0) return this.angle = this.lastAngle = this.triggered = 0;
  };

  JumpPlate.prototype.draw = function() {
    var h, t;
    ctx.save();
    t = this.bottom - this.drawHeight;
    h = this.drawHeight;
    if (this.facing > 0) {
      ctx.translate(this.left + this.width, t + h);
      ctx.rotate(this.angle);
      ctx.fillRect(-this.width, -h, this.width * .3, h / 2);
      ctx.strokeRect(-this.width, -h / 2, this.width, h / 2);
    } else {
      ctx.translate(this.left, t + h);
      ctx.rotate(-this.angle);
      ctx.fillRect(this.width * .7, -h, this.width * .3, h / 2);
      ctx.strokeRect(0, -h / 2, this.width, h / 2);
    }
    return ctx.restore();
  };

  JumpPlate.prototype.somethingAbove = function() {
    var end, hitBody, hitFixture, rayLength, start;
    rayLength = .1;
    start = this.physicsBody.GetPosition();
    end = new b2Vec2(0, -rayLength);
    end.Add(start);
    hitFixture = world.physics.physicsWorld.RayCastOne(start, end);
    hitBody = hitFixture != null ? hitFixture.GetBody() : void 0;
    return hitBody != null ? hitBody.GetUserData() : void 0;
  };

  return JumpPlate;

})(GameObj);

Platform = (function(_super) {

  __extends(Platform, _super);

  function Platform(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width != null ? width : 100;
    this.height = height != null ? height : 3;
    this.fixedRotation = true;
    this.fillColor = "#333333";
  }

  Platform.prototype.draw = function() {
    ctx.save();
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(this.left, this.top, this.width, this.height);
    return ctx.restore();
  };

  return Platform;

})(GameObj);

Wall = (function(_super) {

  __extends(Wall, _super);

  function Wall(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    Wall.__super__.constructor.apply(this, arguments);
    this.fillColor = "#999999";
  }

  return Wall;

})(Platform);

Portal = (function(_super) {

  __extends(Portal, _super);

  function Portal(centerX, centerY, angle, isBlue) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.angle = angle != null ? angle : 0;
    this.isBlue = isBlue != null ? isBlue : true;
    this.width = 40;
    this.height = 10;
    this.velocity = 30;
    this.left = this.centerX - this.width / 2;
    this.top = this.centerY - this.height / 2;
    this.fixedRotation = true;
    this.attached = false;
    this.age = 0;
  }

  Portal.prototype.somethingAhead = function() {
    var end, hitBody, hitFixture, rayLength, start;
    rayLength = 1.2 * this.velocity / world.physics.scale;
    start = new b2Vec2(this.centerX / world.physics.scale, this.centerY / world.physics.scale);
    end = new b2Vec2(rayLength * Math.cos(this.angle), rayLength * Math.sin(this.angle));
    end.Add(start);
    hitFixture = world.physics.physicsWorld.RayCastOne(start, end);
    hitBody = hitFixture != null ? hitFixture.GetBody() : void 0;
    return hitBody != null ? hitBody.GetUserData() : void 0;
  };

  Portal.prototype.update = function() {
    var diffX, diffY, newY, obj, objCenterX, objRelevantY, someBody, x, _i, _len, _ref, _results;
    this.age++;
    if (this.velocity) {
      if ((someBody = this.somethingAhead())) {
        if ((__indexOf.call(world.platforms, someBody) >= 0)) {
          newY = someBody.top;
          this.onTop = true;
          if (this.centerY > someBody.top) {
            newY += someBody.height;
            this.onTop = false;
          }
          diffY = newY - this.centerY;
          diffX = this.velocity * Math.cos(this.angle);
          if (Math.sin(this.angle) !== 0) {
            diffX = diffY * Math.cos(this.angle) / Math.sin(this.angle);
          }
          this.centerX += diffX;
          this.centerY = newY;
          this.left = this.centerX - this.width / 2;
          this.top = this.centerY - this.height / 2;
          this.velocity = 0;
          this.angle = 0;
          if ((this.centerX > someBody.left + someBody.width - this.width / 3) || (this.centerX < someBody.left + this.width / 3) || ((function() {
            var _i, _len, _ref, _results;
            _ref = world.portals;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              x = _ref[_i];
              if (x !== this && Math.abs(this.centerX - x.centerX) < this.width && this.onTop === x.onTop && Math.abs(this.centerY - x.centerY) < 0.5) {
                _results.push(x);
              }
            }
            return _results;
          }).call(this)).length) {
            world.portals.remove(this);
          } else {
            this.attached = true;
          }
        } else {
          world.portals.remove(this);
        }
      } else {
        this.centerX += this.velocity * Math.cos(this.angle);
        this.centerY += this.velocity * Math.sin(this.angle);
        this.left = this.centerX - this.width / 2;
        this.top = this.centerY - this.height / 2;
      }
    }
    if (this.attached && ((function() {
      var _i, _len, _ref, _results;
      _ref = world.portals;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        if (x.isBlue !== this.isBlue && x.attached) _results.push(x);
      }
      return _results;
    }).call(this)).length) {
      _ref = [world.stickMan].concat(world.boxes, world.turrets);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        obj = _ref[_i];
        objCenterX = obj.left + obj.width / 2;
        if (obj.canBePortaled && !obj.beingPortaled && !obj.justPortaled && !obj.exiting) {
          if (Math.abs(objCenterX - this.centerX) < this.width * .6) {
            objRelevantY = obj.top;
            if (this.onTop) objRelevantY += obj.height;
            if (Math.abs(objRelevantY - this.centerY) < this.height * 2) {
              obj.physicsBody.SetActive(false);
              obj.beingPortaled = 1;
              obj.gotoPortal = ((function() {
                var _j, _len2, _ref2, _results2;
                _ref2 = world.portals;
                _results2 = [];
                for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
                  x = _ref2[_j];
                  if (x !== this) _results2.push(x);
                }
                return _results2;
              }).call(this))[0];
              _results.push(obj.fromPortal = this);
            } else {
              _results.push(void 0);
            }
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  Portal.prototype.draw = function(ctx) {
    var radgrad, radsize, sizeFlux;
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle);
    ctx.scale(1, this.height / this.width);
    sizeFlux = .5 * Math.min(this.age, 16) / 16;
    if (!this.attached) ctx.scale(.5 + sizeFlux, .5 + sizeFlux);
    radsize = this.width / 2;
    ctx.translate(-radsize, -radsize);
    radgrad = ctx.createRadialGradient(radsize, radsize, 0, radsize, radsize, radsize);
    if (this.isBlue) {
      radgrad.addColorStop(0, 'rgba(155,185,255,0)');
      radgrad.addColorStop(0.4, 'rgba(122,152,255,.6)');
      radgrad.addColorStop(0.6, 'rgba(211,241,255,1)');
      radgrad.addColorStop(0.8, 'rgba(122,152,255,.9)');
      radgrad.addColorStop(1, 'rgba(155,185,255,0)');
    } else {
      radgrad.addColorStop(0, 'rgba(255,185,155,0)');
      radgrad.addColorStop(0.4, 'rgba(255,185,15,.6)');
      radgrad.addColorStop(0.6, 'rgba(255,245,215,1)');
      radgrad.addColorStop(0.8, 'rgba(255,185,15,.9)');
      radgrad.addColorStop(1, 'rgba(255,185,155,0)');
    }
    ctx.fillStyle = radgrad;
    ctx.fillRect(0, 0, this.width, this.width);
    return ctx.restore();
  };

  return Portal;

})(GameObj);

EditWheel = (function(_super) {

  __extends(EditWheel, _super);

  function EditWheel(centerX, centerY) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.items = [new Platform(this.centerX - 20, this.centerY + 10, 40), new Turret(this.centerX - 40, this.centerY - 30), new Box(this.centerX - 15, this.centerY - 40), new JumpPlate(this.centerX + 25, this.centerY)];
  }

  EditWheel.prototype.draw = function(ctx) {
    var i, _i, _len, _ref;
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle = "#777777";
    _ref = this.items;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      i = _ref[_i];
      i.draw(ctx);
    }
    return ctx.restore();
  };

  return EditWheel;

})(GameObj);

Physics = (function() {
  var createBody, createFixture, defaultFriction;

  defaultFriction = 0.6;

  Physics.prototype.scale = 30.0;

  function Physics() {
    var doSleep, gravity;
    gravity = new b2Vec2(0, 20);
    doSleep = true;
    this.physicsWorld = new b2World(gravity, doSleep);
  }

  createFixture = function(shape) {
    var fixture;
    fixture = new b2FixtureDef();
    fixture.density = 3;
    fixture.friction = defaultFriction;
    fixture.restitution = .3;
    fixture.shape = shape;
    return fixture;
  };

  createBody = function(x, y) {
    var b;
    b = new b2BodyDef;
    b.position.Set(x, y);
    b.type = b2Body.b2_dynamicBody;
    b.linearDamping = .01;
    b.angularDamping = .01;
    return b;
  };

  Physics.prototype.createRect = function(x, y, w, h, a, isStatic) {
    var bodyDef, fixDef;
    if (isStatic == null) isStatic = false;
    fixDef = createFixture(new b2PolygonShape);
    bodyDef = createBody(x, y);
    if (isStatic) bodyDef.type = b2Body.b2_staticBody;
    if (a === null) {
      bodyDef.fixedRotation = true;
    } else {
      bodyDef.angle = a;
    }
    fixDef.shape.SetAsBox(w, h);
    return this.create(bodyDef, fixDef);
  };

  Physics.prototype.createCircle = function(x, y, r, a) {
    var bodyDef, fixDef;
    fixDef = createFixture(new b2CircleShape(r));
    bodyDef = createBody(x, y);
    if (a === null) {
      bodyDef.fixedRotation = true;
    } else {
      bodyDef.angle = a;
    }
    return this.create(bodyDef, fixDef);
  };

  Physics.prototype.create = function(bodyDef, fixDef) {
    var body;
    body = this.physicsWorld.CreateBody(bodyDef);
    body.CreateFixture(fixDef);
    return body;
  };

  Physics.prototype.addGameObj = function(obj, useCircle, isStatic) {
    var angle, centerX, centerY, height, width;
    if (useCircle == null) useCircle = false;
    if (isStatic == null) isStatic = false;
    width = (obj.width / this.scale) / 2;
    height = (obj.height / this.scale) / 2;
    centerX = obj.left / this.scale + width;
    centerY = obj.top / this.scale + height;
    angle = obj.angle;
    if (obj.fixedRotation) angle = null;
    if (useCircle) {
      obj.physicsBody = this.createCircle(centerX, centerY, Math.max(height, width), angle);
    } else {
      obj.physicsBody = this.createRect(centerX, centerY, width, height, angle, isStatic);
    }
    return obj.physicsBody.SetUserData(obj);
  };

  Physics.prototype.debugInit = function() {
    var debugDraw;
    debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(ctx);
    debugDraw.SetDrawScale(this.scale);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    return this.physicsWorld.SetDebugDraw(debugDraw);
  };

  Physics.prototype.debugDraw = function() {
    ctx.save();
    this.physicsWorld.DrawDebugData();
    return ctx.restore();
  };

  Physics.prototype.update = function() {
    var i, numIterations, _results;
    numIterations = 2;
    if (this.onMobile) numIterations = 1;
    _results = [];
    for (i = 1; 1 <= numIterations ? i <= numIterations : i >= numIterations; 1 <= numIterations ? i++ : i--) {
      this.physicsWorld.Step(1 / (frameRate * numIterations), 10, 10);
      _results.push(this.physicsWorld.ClearForces());
    }
    return _results;
  };

  Physics.prototype.updateGameObjPosition = function(obj) {
    var b;
    b = obj.physicsBody;
    obj.left = b.GetPosition().x * this.scale - obj.width / 2;
    obj.top = b.GetPosition().y * this.scale - obj.height / 2;
    return obj.angle = b.GetAngle();
  };

  Physics.prototype.addStickMan = function(stickMan) {
    this.addGameObj(stickMan, true);
    stickMan.physicsBody.SetSleepingAllowed(false);
    return stickMan.physicsBody.GetFixtureList().SetRestitution(0);
  };

  Physics.prototype.addTurret = function(t) {
    var body, bodyDef, boxFixDef, centerX, centerY, circleFixDef, h, w;
    w = t.width / this.scale / 2;
    h = t.height / this.scale / 2;
    centerX = t.left / this.scale + w;
    centerY = t.top / this.scale + h;
    boxFixDef = createFixture(b2PolygonShape.AsOrientedBox(w, h / 2, new b2Vec2(0, h / 2)));
    circleFixDef = createFixture(new b2CircleShape(Math.min(w, h / 2)));
    circleFixDef.shape.SetLocalPosition(new b2Vec2(0, -h / 2));
    bodyDef = createBody(centerX, centerY);
    bodyDef.angle = t.angle;
    body = this.physicsWorld.CreateBody(bodyDef);
    body.CreateFixture(boxFixDef);
    body.CreateFixture(circleFixDef);
    body.SetUserData(t);
    return t.physicsBody = body;
  };

  Physics.prototype.findObjToPickup = function(stickMan) {
    var a, end, hitBody, hitFixture, rayLength, start;
    rayLength = .9 * stickMan.width / this.scale;
    start = stickMan.physicsBody.GetPosition();
    a = stickMan.armAngle;
    end = new b2Vec2(rayLength * Math.cos(a), rayLength * Math.sin(a));
    end.Add(start);
    hitFixture = this.physicsWorld.RayCastOne(start, end);
    hitBody = hitFixture != null ? hitFixture.GetBody() : void 0;
    if (!hitBody) return null;
    if (!hitBody.GetUserData().canBePickedUp) hitBody = null;
    return hitBody != null ? hitBody.GetUserData() : void 0;
  };

  Physics.prototype.attachStickmanHeldObj = function(stickMan, heldObj) {
    var a, endOfPortalGun, jointDef, l;
    jointDef = new b2DistanceJointDef();
    l = .8 * stickMan.width / this.scale;
    a = stickMan.armAngle;
    endOfPortalGun = new b2Vec2(l * Math.cos(a), l * Math.sin(a));
    endOfPortalGun.Add(stickMan.physicsBody.GetPosition());
    jointDef.Initialize(stickMan.physicsBody, heldObj.physicsBody, endOfPortalGun, heldObj.physicsBody.GetPosition());
    jointDef.frequencyHz = 1.0;
    jointDef.length = .2 * heldObj.width / this.scale;
    jointDef.dampingRatio = .1;
    jointDef.collideConnected = true;
    heldObj.physicsBody.GetFixtureList().SetFriction(0);
    stickMan.heldObjJoint = this.physicsWorld.CreateJoint(jointDef);
    return stickMan.heldObj = heldObj;
  };

  Physics.prototype.releaseStickmanHeldObj = function(stickMan, heldObj) {
    if (stickMan.heldObjJoint) {
      this.physicsWorld.DestroyJoint(stickMan.heldObjJoint);
    }
    stickMan.heldObj.physicsBody.GetFixtureList().SetFriction(defaultFriction);
    stickMan.heldObj = null;
    return stickMan.heldObjJoint = null;
  };

  Physics.prototype.updateStickmanHeldObj = function(stickMan, heldObj) {
    this.releaseStickmanHeldObj(stickMan, heldObj);
    return this.attachStickmanHeldObj(stickMan, heldObj);
  };

  Physics.prototype.scaleMass = function(obj, scale) {
    var data;
    data = new b2MassData();
    obj.physicsBody.GetMassData(data);
    data.mass *= scale;
    return obj.physicsBody.SetMassData(data);
  };

  return Physics;

})();

World = (function() {

  function World() {
    this.level = 0;
    this.init();
  }

  World.prototype.initExitTutorial = function() {};

  World.prototype.initPortalTutorial = function() {
    this.platforms = [new Platform(80, 320, 200), new Platform(400, 80, 180)];
    return this.exit = new Exit(530, 130);
  };

  World.prototype.initBoxesTutorial = function() {
    var box, i;
    for (i = 8; i <= 10; i++) {
      box = new Box(100 + 35 * i, 50, Math.PI / 10 * Math.random());
      this.boxes.push(box);
    }
    return this.exit = new Exit(530, 240);
  };

  World.prototype.initJumpPlatesTutorial = function() {
    this.jumpPlates = [new JumpPlate(280, 400, 1)];
    return this.exit = new Exit(450, 140);
  };

  World.prototype.initTurretTutorial = function() {
    this.boxes = [new Box(300, 150)];
    return this.turrets = [new Turret(480, 360)];
  };

  World.prototype.initMainLevel = function() {
    var box, i;
    this.stickMan = new Man(300, 200);
    this.exit = new Exit(450, 30);
    this.platforms = [new Platform(80, 250, 200), new Platform(300, 320, 150)];
    this.jumpPlates = [new JumpPlate(400, 320), new JumpPlate(100, 250, 1), new JumpPlate(150, 400, 1)];
    for (i = 6; i <= 10; i++) {
      box = new Box(100 + 35 * i, 50, Math.PI / 10 * Math.random());
      this.boxes.push(box);
    }
    return this.turrets.push(new Turret(250, 220));
  };

  World.prototype.initTerminalVelocityLevel = function() {
    this.platforms = [new Platform(200, 320, 180), new Platform(200, 80, 180)];
    return this.jumpPlates = [new JumpPlate(20, 400, 1)];
  };

  World.prototype.initBoxPileLevel = function() {
    var box, i, j;
    for (j = 1; j <= 5; j++) {
      for (i = j; j <= 10 ? i <= 10 : i >= 10; j <= 10 ? i++ : i--) {
        box = new Box(100 + 35 * i, 35 * j, Math.PI / 10 * Math.random());
        this.boxes.push(box);
      }
    }
    return this.exit = new Exit(530, 240);
  };

  World.prototype.initJumpJumpJumpLevel = function() {
    var i, j, _results;
    this.exit = new Exit(290, 20);
    this.stickMan = new Man(150, 100);
    for (i = 0; i <= 3; i++) {
      this.boxes.push(new Box(300, 100 + 35 * i));
    }
    _results = [];
    for (i = 0; i <= 1; i++) {
      _results.push((function() {
        var _results2;
        _results2 = [];
        for (j = 0; j <= 4; j++) {
          if (j !== 4) {
            this.platforms.push(new Platform(0 + 520 * i, 60 + 85 * j, 80));
          }
          _results2.push(this.jumpPlates.push(new JumpPlate(65 + 455 * i, 59 + 85 * j, 1 - 2 * i)));
        }
        return _results2;
      }).call(this));
    }
    return _results;
  };

  World.prototype.initJumpThroughSomeBulletsLevel = function() {
    var i, j, _results;
    this.exit = new Exit(290, 20);
    this.stickMan = new Man(150, 100);
    for (i = 0; i <= 3; i++) {
      this.boxes.push(new Box(300, 100 + 35 * i));
    }
    _results = [];
    for (i = 0; i <= 1; i++) {
      _results.push((function() {
        var _results2;
        _results2 = [];
        for (j = 0; j <= 4; j++) {
          if (j !== 4) {
            this.platforms.push(new Platform(0 + 520 * i, 60 + 85 * j, 80));
          }
          if (j === 4) {
            this.turrets.push(new Turret(15 + 555 * i, 29 + 85 * j, 1 - 2 * i));
          }
          _results2.push(this.jumpPlates.push(new JumpPlate(65 + 455 * i, 59 + 85 * j, 1 - 2 * i)));
        }
        return _results2;
      }).call(this));
    }
    return _results;
  };

  World.prototype.initJumpThroughBulletsLevel = function() {
    var i, j, _results;
    this.exit = new Exit(290, 20);
    this.stickMan = new Man(150, 100);
    for (i = 0; i <= 3; i++) {
      this.boxes.push(new Box(300, 100 + 35 * i));
    }
    _results = [];
    for (i = 0; i <= 1; i++) {
      _results.push((function() {
        var _results2;
        _results2 = [];
        for (j = 0; j <= 4; j++) {
          if (j !== 4) {
            this.platforms.push(new Platform(0 + 520 * i, 60 + 85 * j, 80));
          }
          this.turrets.push(new Turret(15 + 555 * i, 29 + 85 * j, 1 - 2 * i));
          _results2.push(this.jumpPlates.push(new JumpPlate(65 + 455 * i, 59 + 85 * j, 1 - 2 * i)));
        }
        return _results2;
      }).call(this));
    }
    return _results;
  };

  World.prototype.init = function() {
    var h, t, w;
    w = virtualCanvasWidth;
    h = virtualCanvasHeight;
    t = 2;
    this.walls = [new Wall(0, 0, w, t), new Wall(0, h - t, w, t), new Wall(0, 0, t, h), new Wall(w - t, 0, t, h)];
    this.stickMan = new Man(50, 100);
    this.exit = new Exit(530, 290);
    this.platforms = [];
    this.jumpPlates = [];
    this.boxes = [];
    this.turrets = [];
    this.portals = [];
    this.bullets = [];
    this.level++;
    if (this.level > 10) this.level = 6;
    switch (this.level) {
      case 1:
        this.initExitTutorial();
        break;
      case 2:
        this.initJumpPlatesTutorial();
        break;
      case 3:
        this.initPortalTutorial();
        break;
      case 4:
        this.initBoxesTutorial();
        break;
      case 5:
        this.initTurretTutorial();
        break;
      case 6:
        this.initBoxPileLevel();
        break;
      case 7:
        this.initJumpJumpJumpLevel();
        break;
      case 8:
        this.initJumpThroughSomeBulletsLevel();
        break;
      case 9:
        this.initJumpThroughBulletsLevel();
        break;
      default:
        this.initMainLevel();
    }
    return this.initPhysics();
  };

  World.prototype.initPhysics = function() {
    var b, j, p, t, w, _i, _j, _k, _l, _len, _len2, _len3, _len4, _len5, _m, _ref, _ref2, _ref3, _ref4, _ref5;
    this.physics = new Physics();
    this.physics.onMobile = navigator.appVersion.indexOf("Mobile") >= 0;
    _ref = this.platforms;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      this.physics.addGameObj(p, false, true);
    }
    _ref2 = this.walls;
    for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
      w = _ref2[_j];
      this.physics.addGameObj(w, false, true);
    }
    _ref3 = this.jumpPlates;
    for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
      j = _ref3[_k];
      this.physics.addGameObj(j, false, true);
    }
    _ref4 = this.boxes;
    for (_l = 0, _len4 = _ref4.length; _l < _len4; _l++) {
      b = _ref4[_l];
      this.physics.addGameObj(b);
    }
    this.physics.addStickMan(this.stickMan);
    this.physics.scaleMass(this.stickMan, 3);
    _ref5 = this.turrets;
    for (_m = 0, _len5 = _ref5.length; _m < _len5; _m++) {
      t = _ref5[_m];
      this.physics.addTurret(t);
    }
    this.physicsDebug = false;
    if (this.physicsDebug) return this.physics.debugInit();
  };

  World.prototype.update = function() {
    var x, _i, _len, _ref, _results;
    if (this.editTriggered) {
      if (this.paused) {
        this.paused = false;
      } else {
        this.paused = true;
        this.init();
      }
      this.editTriggered = false;
    }
    if (this.resetOnNextUpdate) {
      this.init();
      this.resetOnNextUpdate = false;
    }
    if (this.paused) {
      if (this.mouseDown) {
        if (this.editWheel) {
          this.editWheel = null;
        } else {
          this.editWheel = new EditWheel(this.mouseX, this.mouseY);
        }
        this.mouseDown = false;
      }
      return;
    } else {
      if (this.editWheel) this.editWheel = null;
    }
    this.physics.update();
    _ref = [].concat(this.stickMan, this.exit, this.boxes, this.platforms, this.walls, this.turrets, this.jumpPlates, this.portals, this.bullets);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      x = _ref[_i];
      _results.push(x.update());
    }
    return _results;
  };

  World.prototype.draw = function(ctx) {
    var h, w;
    if (this.windowInnerWidth !== window.innerWidth || this.windowInnerHeight !== window.innerHeight) {
      this.windowInnerWidth = window.innerWidth;
      this.windowInnerHeight = window.innerHeight;
      w = this.windowInnerWidth;
      if (w >= 20) w -= 10;
      if (w > 900) w = 900;
      h = w * 2 / 3;
      if (h > this.windowInnerHeight - 10) {
        h = this.windowInnerHeight;
        if (h >= 20) h -= 10;
        w = h * 1.5;
      }
      ctx.canvas.width = w;
      ctx.canvas.height = h;
      ctx.canvas.style.left = ((this.windowInnerWidth - w) / 2) + "px";
      ctx.canvas.style.top = Math.max(5, (this.windowInnerHeight - h) / 3) + "px";
    }
    w = ctx.canvas.width;
    h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(w / virtualCanvasWidth, w / virtualCanvasWidth);
    if (this.physicsDebug) this.physics.debugDraw();
    this.redraw(ctx);
    return ctx.restore();
  };

  World.prototype.redraw = function(ctx) {
    var x, _i, _len, _ref;
    _ref = [].concat(this.stickMan, this.exit, this.boxes, this.platforms, this.walls, this.turrets, this.jumpPlates, this.portals, this.bullets);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      x = _ref[_i];
      x.draw(ctx);
    }
    if (this.editWheel) return this.editWheel.draw(ctx);
  };

  return World;

})();

world = null;

ctx = null;

b2Vec2 = Box2D.Common.Math.b2Vec2;

b2AABB = Box2D.Collision.b2AABB;

_ref = Box2D.Dynamics, b2BodyDef = _ref.b2BodyDef, b2Body = _ref.b2Body, b2FixtureDef = _ref.b2FixtureDef, b2Fixture = _ref.b2Fixture, b2World = _ref.b2World, b2DebugDraw = _ref.b2DebugDraw;

_ref2 = Box2D.Collision.Shapes, b2PolygonShape = _ref2.b2PolygonShape, b2CircleShape = _ref2.b2CircleShape, b2MassData = _ref2.b2MassData;

b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;

arrowKeys = {
  left: 37,
  up: 38,
  right: 39,
  down: 40
};

wasdKeys = {
  a: 65,
  s: 83,
  w: 87,
  d: 68
};

modifierKeys = {
  shift: 16,
  cntl: 17
};

escKey = 27;

frameRate = 30;

stickManTryToJumpForNumFrames = 6;

virtualCanvasWidth = 600;

virtualCanvasHeight = 400;

after = function(ms, cb) {
  return setTimeout(cb, ms);
};

every = function(ms, cb) {
  return setInterval(cb, ms);
};

randomInt = function(a) {
  return Math.floor(Math.random() * a);
};

Array.prototype.remove = function(e) {
  var t, _ref3;
  if ((t = this.indexOf(e)) > -1) {
    return ([].splice.apply(this, [t, t - t + 1].concat(_ref3 = [])), _ref3);
  }
};

Array.prototype.filterOutValue = function(v) {
  var x, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = this.length; _i < _len; _i++) {
    x = this[_i];
    if (x !== v) _results.push(x);
  }
  return _results;
};

initGamePlayDemo = function() {
  var _ref3;
  ctx = (_ref3 = document.getElementById('mainCanvas')) != null ? _ref3.getContext('2d') : void 0;
  world = new World();
  world.draw(ctx);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  document.onmousemove = handleMouseMove;
  document.onmousedown = handleMouseDown;
  document.oncontextmenu = function(evt) {
    return evt.preventDefault();
  };
  if (navigator.appVersion.indexOf("Mobile") >= 0) {
    document.ontouchstart = handleTouchStart;
    document.ontouchmove = handleTouchMove;
    document.ontouchend = handleTouchEnd;
    document.ontouchcancel = handleTouchEnd;
    window.ondeviceorientation = handleDeviceOrientation;
    window.onorientationchange = handleOrientationChange;
  }
  return updateWorld();
};

updateWorld = function() {
  world.update();
  world.draw(ctx);
  return after(1000 / frameRate, updateWorld);
};

handleKeyDown = function(evt) {
  var stickMan;
  stickMan = world.stickMan;
  switch (evt.keyCode) {
    case arrowKeys.left:
    case wasdKeys.a:
      stickMan.running = true;
      stickMan.facing = -1;
      return false;
    case arrowKeys.up:
    case wasdKeys.w:
      stickMan.jumping = stickManTryToJumpForNumFrames;
      return false;
    case arrowKeys.right:
    case wasdKeys.d:
      stickMan.running = true;
      stickMan.facing = 1;
      return false;
    default:
      return true;
  }
};

handleKeyUp = function(evt) {
  var stickMan;
  stickMan = world.stickMan;
  switch (evt.keyCode) {
    case arrowKeys.left:
    case arrowKeys.right:
    case wasdKeys.a:
    case wasdKeys.d:
      stickMan.running = false;
      return false;
    case arrowKeys.up:
    case wasdKeys.w:
      return false;
    case escKey:
      break;
    default:
      return true;
  }
};

handleMouseMove = function(evt) {
  world.mouseX = (evt.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
  return world.mouseY = (evt.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
};

handleMouseDown = function(evt) {
  world.mouseDown = true;
  return evt.preventDefault();
};

touchControlUI = 1;

handleTouchStartOrEndMethod1Helper = function(evt) {
  var minBeforeMove, stickMan, x, y;
  stickMan = world.stickMan;
  x = (evt.touches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
  y = (evt.touches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
  minBeforeMove = 10;
  x -= stickMan.left + stickMan.width / 2;
  y -= stickMan.top + stickMan.height / 2;
  if (y < -minBeforeMove && Math.abs(x) < -y / 5) {
    stickMan.jumping = stickManTryToJumpForNumFrames;
  } else {
    if (x > minBeforeMove) {
      stickMan.running = true;
      stickMan.facing = 1;
    } else if (x < -minBeforeMove) {
      stickMan.running = true;
      stickMan.facing = -1;
    } else {
      stickMan.running = false;
    }
  }
  if (evt.touches.length > 1 && (evt.changedTouches.length > 1 || evt.changedTouches[0].identifier === evt.touches[1].identifier)) {
    world.mouseX = (evt.touches[1].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
    return world.mouseY = (evt.touches[1].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
  }
};

handleTouchStart = function(evt) {
  var stickMan, t, x, y, _i, _len, _ref3;
  stickMan = world.stickMan;
  stickMan.touchedDuration = 1;
  if (touchControlUI === 3) {
    x = (evt.changedTouches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
    y = (evt.changedTouches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
    world.mouseX = x;
    world.mouseY = y;
  } else if (touchControlUI === 2) {
    _ref3 = evt.changedTouches;
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      t = _ref3[_i];
      x = (t.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
      y = (t.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
      if (x < virtualCanvasWidth / 2) {
        if (y < 100) stickMan.jumping = stickManTryToJumpForNumFrames;
      } else {
        world.mouseX = (x - virtualCanvasWidth / 2) * 2;
        world.mouseY = y;
      }
    }
  } else if (touchControlUI === 1) {
    handleTouchStartOrEndMethod1Helper(evt);
  }
  return evt.preventDefault();
};

handleTouchMove = function(evt) {
  var stickMan, t, x, y, _i, _len, _ref3;
  stickMan = world.stickMan;
  if (touchControlUI === 3) {
    x = (evt.changedTouches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
    y = (evt.changedTouches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
    world.mouseX = x;
    world.mouseY = y;
  } else if (touchControlUI === 2) {
    _ref3 = evt.changedTouches;
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      t = _ref3[_i];
      x = (t.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
      y = (t.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
      if (x < virtualCanvasWidth / 2) {
        if (x < 100) {
          stickMan.running = true;
          stickMan.facing = -1;
        } else if (x > 200) {
          stickMan.running = true;
          stickMan.facing = 1;
        } else {
          stickMan.running = false;
        }
        if (y < 100) stickMan.jumping = stickManTryToJumpForNumFrames;
      } else {
        world.mouseX = (x - virtualCanvasWidth / 2) * 2;
        world.mouseY = y;
      }
    }
  } else if (touchControlUI === 1) {
    handleTouchStartOrEndMethod1Helper(evt);
  }
  return evt.preventDefault();
};

handleTouchEnd = function(evt) {
  var stickMan, t, x, y, _i, _len, _ref3;
  stickMan = world.stickMan;
  x = (evt.changedTouches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
  y = (evt.changedTouches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
  if (touchControlUI === 1) {
    if (stickMan.touchedDuration < frameRate / 5) {
      world.mouseX = x;
      world.mouseY = y;
      world.mouseDown = true;
    }
    if (evt.touches.length <= 1) {
      stickMan.running = false;
      stickMan.touchedDuration = 0;
    }
  } else if (touchControlUI === 2) {
    _ref3 = evt.changedTouches;
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      t = _ref3[_i];
      x = (t.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
      y = (t.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
      if (x < virtualCanvasWidth / 2) stickMan.running = false;
      if (x >= virtualCanvasWidth / 2 && stickMan.touchedDuration < frameRate / 5) {
        world.mouseDown = true;
      }
    }
  } else if (touchControlUI === 3) {
    if (stickMan.touchedDuration < frameRate / 5) {
      world.mouseX = x;
      world.mouseY = y;
      if (evt.changedTouches.length > 1) {
        world.mouseX = (evt.changedTouches[1].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width;
        world.mouseY = (evt.changedTouches[1].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width;
      }
      world.mouseDown = true;
    }
  }
  return evt.preventDefault();
};

handleDeviceOrientation = function(evt) {
  var rightTilt, stickMan, upTilt, _ref3, _ref4;
  if (touchControlUI !== 3) return true;
  stickMan = world.stickMan;
  upTilt = evt.beta;
  rightTilt = evt.gamma;
  switch (window.orientation) {
    case 90:
      _ref3 = [-rightTilt, upTilt], upTilt = _ref3[0], rightTilt = _ref3[1];
      break;
    case -90:
      _ref4 = [rightTilt, -upTilt], upTilt = _ref4[0], rightTilt = _ref4[1];
  }
  if (Math.abs(rightTilt) > 15) {
    stickMan.running = true;
    stickMan.facing = rightTilt > 0 ? 1 : -1;
  } else {
    stickMan.running = false;
  }
  if (upTilt < 30) stickMan.jumping = stickManTryToJumpForNumFrames;
  return evt.preventDefault();
};

handleOrientationChange = function(evt) {
  return evt.preventDefault();
};
