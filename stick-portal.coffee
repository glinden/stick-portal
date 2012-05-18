###
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
###


# Classes for objects in the game.  Most objects are defined by top
# left corner, then width and height.  Many objects have a physics
# object attached, which is its representation in the physics sim that
# runs along side the drawing code

# Base class for all game objects, just contains some utility
# functions and a convenience call to update the location based on the
# physics sim for objects that are in the physics sim
class GameObj
    constructor: (@left, @top, @width, @height, @angle = 0) ->

    distance: (otherObj) ->
        x = @left + @width / 2
        y = @top + @height / 2
        x2 = otherObj.left + otherObj.width / 2
        y2 = otherObj.top + otherObj.height / 2
        return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))

    draw: (ctx) ->

    update: () ->
        if (@physicsBody)
            # Update position and angle based on the physics simulation
            world.physics.updateGameObjPosition(@)


# Class to handle common code for objects that are going through a portal
class PortalableGameObj extends GameObj
    beingPortaledMaxFrames = 4
    justPortaledFramesWait = 15

    constructor: (@left, @top, @width, @height, @angle = 0) ->
        super(@left, @top, @width, @height, @angle)
        @canBePortaled = true

    draw: (ctx) ->
        if (@beingPortaled)
            # Draw the object as a fuzzy small black circle, then a smaller one, then a glowing circle of the portal color
            ctx.save()
            ctx.translate(@left, @top)
            radsize = Math.min(@width/2, @height/2)
            radgrad = ctx.createRadialGradient(@width/2,@height/2,0,@width/2,@height/2,radsize)
            size = .4
            color = 'rgba(0,0,0,0.5)'
            absBeingPortaled = Math.abs(@beingPortaled)
            atPortal = @gotoPortal
            atPortal = @fromPortal if (@beingPortaled > 0)
            if (absBeingPortaled == 2)
                size = .2
            else if (absBeingPortaled > 2)
                if (atPortal.isBlue)
                    color = 'rgba(122,152,255,.9)'
                else
                    color = 'rgba(255,185,15,.9)'
                size = .1 + (absBeingPortaled - 2) * .4 / (beingPortaledMaxFrames - 2)
            radgrad.addColorStop(size - .1, 'rgba(255,255,255,0)')
            radgrad.addColorStop(size, color)
            radgrad.addColorStop(size + .1, 'rgba(255,255,255,0)')
            ctx.fillStyle = radgrad
            ctx.fillRect(0, 0, @width, @height)
            ctx.restore()

    update: () ->
        if (@beingPortaled)
            if (@beingPortaled >= beingPortaledMaxFrames)
                # Spent long enough at this portal, send us over to the other one
                @beingPortaled = -@beingPortaled
                newX = @gotoPortal.centerX / world.physics.scale
                newY = @gotoPortal.centerY / world.physics.scale
                modY = (@height / 2 + @gotoPortal.height) / world.physics.scale
                if (@gotoPortal.onTop) then newY -= modY else newY += modY
                @physicsBody.SetPosition(new b2Vec2(newX, newY))
                world.physics.updateGameObjPosition(@)
                if (@fromPortal.onTop is @gotoPortal.onTop)
                    # We need to reverse the Y velocity when we come out of a portal oriented the same as us
                    velocityVec = @physicsBody.GetLinearVelocity()
                    velocityVec.Set(velocityVec.x, -velocityVec.y)
                    @physicsBody.SetLinearVelocity(velocityVec)
            else
                @beingPortaled++
            if (!@beingPortaled)
                # We are all done.  Turn back on the physics sim and do a little clean up.
                @gotoPortal = null
                @fromPortal = null
                @justPortaled = justPortaledFramesWait
                @physicsBody.SetActive(true) if (!@exiting)
        @justPortaled-- if (@justPortaled)
        super()

class Man extends PortalableGameObj
    legPos: {pass: 3, up: 2, contact: 1, V: 0}
    maxHoldDistance = 100

    constructor: (@left, @top, @width = 50, @height = 50) ->
        super(@left, @top, @width, @height)
        @legs = @legPos.V
        @facing = 0        # -1 for left, 1 for right, 0 for neither
        @running = false   # Currently running
        @jumping = 0       # Currently jumping
        @armAngle = 0      # In radians, 0 is horizontal to the right
        @fixedRotation = true

    update: () ->
        return super() if (@beingPortaled or @exiting)

        @touchedDuration++ if (@touchedDuration) # For handling touch events

        # Compute the angle from the stickman to the mouse
        x = world.mouseX - (@left + @width / 2)
        y = world.mouseY - (@top + @height / 2)
        @armAngle = Math.atan2(y,x)

        # TO DO: Physics code should be moved to physics class?
        runningSpeed = 6
        jumpSpeed = 8
        vx = @physicsBody.GetLinearVelocity().x
        vy = @physicsBody.GetLinearVelocity().y
        # You can only change velocities if in contact with the ground
        if (someBody = @somethingUnderfoot())
            if (@jumping && (Math.abs(vy) < jumpSpeed * .2))
                @physicsBody.ApplyImpulse(new b2Vec2(0, -jumpSpeed * @physicsBody.GetMass()), new b2Vec2(@physicsBody.GetPosition().x, @physicsBody.GetPosition().y))
                if (someBody.canBePickedUp)
                    # Jumping off boxes and other things that can be picked up should apply some force to them
                    downForce = someBody.physicsBody.GetMass() * jumpSpeed * .5
                    someBody.physicsBody.ApplyImpulse(new b2Vec2(0, downForce), new b2Vec2(@physicsBody.GetPosition().x, someBody.physicsBody.GetPosition().y))
                    @jumping = 0
                    if (@heldObj and someBody is @heldObj)
                        # Odd case of jumping off a box you are holding.  Release the hold.
                        world.physics.releaseStickmanHeldObj(this, @heldObj)
                        world.mouseDown = false
            else if (@running)
                # Accelerate the player in the direction we are facing,
                # but do not allow the velocity to go over the maximum running
                # speed unless it already was over the maximum and we are
                # decreasing it
                maxVx = runningSpeed * @facing
                deltaVx = maxVx * .3
                newVx = vx + deltaVx
                if (Math.abs(newVx) > Math.abs(maxVx))
                    if (Math.abs(vx) > Math.abs(maxVx))
                        # We were already over the maximum speed.  Just do
                        # not increase the speed any further
                        newVx = vx if (Math.abs(newVx) > Math.abs(vx))
                    else
                        newVx = maxVx
                @physicsBody.SetLinearVelocity(new b2Vec2(newVx, vy))
        else if (Math.abs(@left - @leftAve) < .2 and Math.abs(@top - @topAve) < .2)
            # We aren't moving and there's nothing under us.  That's odd.  Shouldn't
            # we be falling?  Golly gosh, I guess we're stuck.
            if (@jumping or @running)
                # Deal with this unusual case where we are stuck, allow player to snudge a bit
                ix = 0
                ix = runningSpeed * .3 * @facing * @physicsBody.GetMass() if (@running)
                iy = 0
                if (@jumping)
                    iy = jumpSpeed * -.3 * @physicsBody.GetMass()
                    @jumping = 0
                @physicsBody.ApplyImpulse(new b2Vec2(ix, iy), new b2Vec2(@physicsBody.GetPosition().x, @physicsBody.GetPosition().y))
            else
                # We are in the air, not moving, and are not trying to move.
                # Apply a mild downward force to try to unstick us automagically.
                @physicsBody.ApplyImpulse(new b2Vec2(0, .2 * jumpSpeed * @physicsBody.GetMass()), new b2Vec2(@physicsBody.GetPosition().x, @physicsBody.GetPosition().y))
        else if (@running)
            # The player is flying through the air but trying to run.  Let them move a
            # little even though that is not physically correct because it is
            # frustrating to players if we do not allow this.
            # Accelerate the player in the direction we are facing,
            # but do not allow the velocity to go over the maximum running
            # speed unless it already was over the maximum
            maxVx = runningSpeed * @facing
            deltaVx = maxVx * .05
            newVx = vx + deltaVx
            if (Math.abs(newVx) > Math.abs(maxVx))
                if (Math.abs(vx) > Math.abs(maxVx))
                    # We were already over the maximum speed.  Just do
                    # not increase the speed any further
                    newVx = vx if (Math.abs(newVx) > Math.abs(vx))
                else
                    newVx = maxVx
            @physicsBody.SetLinearVelocity(new b2Vec2(newVx, vy))

        # Track how much we are moving over time, used to help determine if we are stuck
        @leftAve = (@leftAve ? 0) * .9 + @left * .1
        @topAve = (@topAve ? 0) * .9 + @top * .1

        # We keep trying to jump for a few frames after the key press until we do it
        # or give up.  Trying again for a few frames like this makes jumping
        # feel more responsive
        @jumping-- if (@jumping > 0)

        @updateLegs()
        # On mouseDown, if near a box, pick up the box. Otherwise, shoot a portal
        if (world.mouseDown)
            if (@heldObj)
                world.physics.releaseStickmanHeldObj(this, @heldObj) if (@heldObj)
            else
                @heldObj = world.physics.findObjToPickup(this)
                if (@heldObj)
                    world.physics.attachStickmanHeldObj(this, @heldObj) if (@heldObj)
                    @lastArmAngle = @armAngle
                else
                    @shootPortal()
            world.mouseDown = false
        else if (@heldObj)
            # If the held object gets really far away, break the connection
            # And if the arm moves enough, we should adjust how the held object is held
            if (@distance(@heldObj) > maxHoldDistance)
                world.physics.releaseStickmanHeldObj(this, @heldObj)
            else if (Math.abs(@armAngle - @lastArmAngle) > .1)
                world.physics.updateStickmanHeldObj(this, @heldObj)
                @lastArmAngle = @armAngle
        super()

    somethingUnderfoot: () ->
        rayLength = .6 * @width / world.physics.scale  # Look a short distance under us
        start = @physicsBody.GetPosition()
        # Fire off two rays, one a little to the left, one a little to the right, to avoid getting stuck
        # if there is nothing directly underneath
        end = new b2Vec2(rayLength * -.3, rayLength)
        end.Add(start)
        hitFixture = world.physics.physicsWorld.RayCastOne(start, end)
        hitBody = hitFixture?.GetBody()
        return hitBody.GetUserData() if (hitBody)
        end = new b2Vec2(rayLength * .3, rayLength)
        end.Add(start)
        hitFixture = world.physics.physicsWorld.RayCastOne(start, end)
        hitBody = hitFixture?.GetBody()
        return hitBody?.GetUserData()

    shootPortal: () ->
        # If a portal of the selected color already exists, destroy it
        # Create a new portal, send it flying through the air
        isBlue = true
        # We alternate portal colors if both portals exist.  Otherwise, we shoot whichever color does not exist.
        if ((x for x in world.portals when x.isBlue).length and (@shootOrangeNext or !(x for x in world.portals when !x.isBlue).length))
            # A blue portal exists and it is time to shoot an orange or there is no orange, so shoot an orange portal
            isBlue = false
        # Kill any existing portals of this color
        world.portals = (x for x in world.portals when x.isBlue isnt isBlue)
        # Create the new portal, starting it at the end of the portal gun
        centerX = @left + @width / 2 + Math.cos(@armAngle) * @width/2
        centerY = @top + @height / 2 + Math.sin(@armAngle) * @width/2
        world.portals.push(new Portal(centerX, centerY, @armAngle, isBlue))
        # Shoot the other color next time
        @shootOrangeNext = isBlue

    updateLegs: () ->
        # We only want to update the leg keyframes about 15 times per second
        if (@legFrameWait >= 1)
            @legFrameWait--
            return
        else
            @legFrameWait = frameRate / 15

        # Run through the running keyframe leg states until you get back to 0, which is standing
        if @legs > 1
            @legs--
        else if @running
            @legs = @legPos.pass
        else if @legs == 1
            @legs--

    draw: (ctx) ->
        return super(ctx) if (@beingPortaled)

        centerX = @left + @width / 2
        centerY = @top + @height / 2

        ctx.beginPath()

        # Head
        ctx.arc(centerX, @top + @height * .25, @height * .20, 0, Math.PI*2)

        # Body
        ctx.moveTo(centerX, @top + @height * .45)  # Start a little above the arms to make a neck
        ctx.lineTo(centerX, @top + @height * .75)

        # Legs
        # (the leg states are approximations from keyframes from an animation book, see
        #  http://splinedoctors.com/blog/wp-content/uploads/2009/01/walkbasics.jpg )
        switch @legs
            when @legPos.pass
                ctx.lineTo(centerX + @facing * @width / 12, @top + @height * .88)  # Left leg
                ctx.lineTo(centerX - @facing * @width / 14, @top + @height * .90)  # Left leg
                ctx.moveTo(centerX, @top + @height * .75)
                ctx.lineTo(centerX - @facing * @width / 30, @top + @height)           # Right leg
            when @legPos.up
                ctx.lineTo(centerX + @facing * @width / 9, @top + @height * .85)  # Left leg
                ctx.lineTo(centerX, @top + @height * .95)  # Left leg
                ctx.moveTo(centerX, @top + @height * .75)
                ctx.lineTo(centerX - @facing * @width / 10, @top + @height)           # Right leg
            when @legPos.contact
                ctx.lineTo(centerX - @facing * @width / 18, @top + @height * 7 / 8)  # Left leg
                ctx.lineTo(centerX - @facing * @width / 6, @top + @height)  # Left leg
                ctx.moveTo(centerX, @top + @height * .75)
                ctx.lineTo(centerX + @facing * @width / 7, @top + @height)  # Right leg
            else
                # Simple "V" position
                ctx.lineTo(centerX - @width / 8, @top + @height)  # Left leg
                ctx.moveTo(centerX, @top + @height * .75)
                ctx.lineTo(centerX + @width / 8, @top + @height)  # Right leg

        # Arms hold the portal gun and point contantly at the mouse
        ctx.save()
        ctx.translate(centerX, @top + @height * .50)
        if (Math.abs(@armAngle) > Math.PI * .5)
            ctx.scale(-1, 1)  # Mirror image looks better than rotating past 180 degrees
            ctx.rotate(-@armAngle + Math.PI)
        else
            ctx.rotate(@armAngle)
        ctx.moveTo(0, 0)
        ctx.lineTo(@width * .22, @height * .02)
        ctx.moveTo(0, 0)
        ctx.lineTo(@width * .23, @height * .05)
        # ... and portal gun, starting with an oval
        ctx.save()   # because we are about to do an oval and need to change the scale
        ctx.translate(@width * .30, @height * .03)
        ctx.scale(1, 0.5)
        ctx.moveTo(@width * .08,0)
        ctx.arc(0,0, @width * .08, 0, Math.PI*2)
        ctx.restore()  # go back to the original scale
        # ... and add a little dish-like thing to the end of the oval to complete the portal gun
        ctx.moveTo(@width * .38, @height * .03)
        ctx.lineTo(@width * .40, @height * .00)
        ctx.moveTo(@width * .38, @height * .03)
        ctx.lineTo(@width * .40, @height * .06)
        # Portal gun should glow if holding a box
        if (@heldObj)
            ctx.save()
            glowStartX = @width * .42
            glowWidth = @width * .12
            lingrad = ctx.createLinearGradient(glowStartX, 0, glowStartX + glowWidth, 0)
            lingrad.addColorStop(0, 'rgba(255,255,255,0)')
            lingrad.addColorStop(0.5, 'rgba(122,152,255,1)')
            lingrad.addColorStop(1, 'rgba(255,255,255,0)')
            ctx.fillStyle = lingrad
            ctx.fillRect(glowStartX, -@height * .02, glowWidth, @height * 0.10)
            ctx.restore()
        ctx.restore()

        ctx.stroke()

class Exit extends GameObj
    maxExitAnimationFrames = 25

    constructor: (@left, @top, @width = 25, @height = 40) ->
        super(@left, @top, @width, @height)
        @triggered = false
        @fixedRotation = true

    draw: (ctx) ->
        if (@exiting)
            # If someone is leaving through the exit, make the golden halo pulse
            centerX = @left + @width / 2
            centerY = @top + @height / 2
            radsize = Math.max(@width/2, @height/2) * (1 + Math.abs((@exiting % 10) - 2 * (@exiting % 5)) / 5)
            radgrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radsize)
            radgrad.addColorStop(0, 'rgba(255,255,255,0)')
            radgrad.addColorStop(.7, 'rgba(255,210,0,.5)')
            radgrad.addColorStop(1, 'rgba(255,255,255,0)')
            ctx.save()
            ctx.fillStyle = radgrad
            ctx.fillRect(@left - radsize * 2, @top - radsize * 2, @width + radsize * 4, @height + radsize * 4)
            ctx.restore()
        # Golden yellow halo around the door
        ctx.save()
        if (!@exiting)
            ctx.shadowBlur = 12
            ctx.shadowColor = "#FFD700"
        ctx.fillStyle = 'rgba(255,255,255,1)'
        ctx.fillRect(@left+5, @top+5, @width-10, @height-10)
        ctx.restore()
        ctx.save()
        ctx.strokeStyle = "#444444"  # Dark gray door frame
        ctx.strokeRect(@left+5, @top+5, @width-10, @height-10)
        ctx.restore()

    update: () ->
        # Running the exit animation
        if (@exiting)
            @exiting++
            if (@exiting > maxExitAnimationFrames)
                world.resetOnNextUpdate = true
            return
        # Check if the man is at the exit
        man = world.stickMan
        centerX = @left + @width / 2
        manCenterX = man.left + man.width / 2
        if (Math.abs(manCenterX - centerX) < @width * .7)  # Really should be width * .5, but make a little easier
            centerY = @top + @height / 2
            manCenterY = man.top + man.height / 2
            if (Math.abs(manCenterY - centerY) < @height * .7)
                # The man has gotten to the exit.  Stop the man and start the exit animation.
                man.exiting = true
                man.physicsBody.SetActive(false)
                @exiting = 1

class Box extends PortalableGameObj
    constructor: (@left, @top, @angle = 0, @width = 30, @height = 30) ->
        super(@left, @top, @width, @height, @angle)
        @canBePickedUp = true

    draw: (ctx) ->
        return super(ctx) if (@beingPortaled)
        centerX = @left + @width / 2
        centerY = @top + @height / 2
        ctx.save()
        # Need to translate to the center to match the physics sim rotations
        ctx.translate(centerX, centerY)
        ctx.rotate(@angle)
        ctx.strokeRect(-@width / 2, -@height / 2, @width, @height)
        ctx.restore()

class Bullet extends GameObj
    constructor: (@centerX, @centerY, @facing) ->
        @angle = 0
        @width = 2
        @height = 2
        @velocity = 25 * @facing
        @left = @centerX - @width / 2
        @top = @centerY - @height / 2
        @fixedRotation = true
        @life = frameRate / 4  # Bullets survive for this many frames

    draw: (ctx) ->
        ctx.fillRect(@left, @top, @width, @height)

    update: () ->
        super
        @life--
        @destroySelf() if (@life <= 0)

    destroySelf: () ->
        world.bullets.remove(this)
        world.physics.physicsWorld.DestroyBody(@physicsBody)

class Turret extends PortalableGameObj
    shotsPerSecond = 5

    constructor: (@left, @top, @facing = -1, @width = 15, @height = 30) ->
        super(@left, @top, @width, @height)
        # Facing is -1 for left, 1 for right
        @firing = 0
        @angle = 0
        @shotsFired = 0
        @canBePickedUp = true

    update: () ->
        super
        return if (@beingPortaled)

        # Pause to reload if we have fired for a long time.  This gives the player a chance
        # to get out of situations that otherwise would make the game unsolvable.
        if (@shotsFired > shotsPerSecond * 20)
            @shotsFired = 0
            @reloading = frameRate * 4  # Stop for four seconds
        if (@reloading)
            @reloading--
            @reloading = 0 if (@reloading < 0)
            return  # Don't shoot at the player

        # Detect if player is in front, start/stop firing
        angle = Math.abs(@angle) % (Math.PI * 2)
        if (((angle > Math.PI * 2 - .1) or (angle < .1)) and !@firing and this isnt world.stickMan.heldObj)
            # Only fire if (mostly) upright, not being picked up, and have not fired recently
            target = @lookForTarget()
            if (target is world.stickMan)
                # Create and fire a projectile
                x = @left
                x += @width if (@facing > 0)
                b = new Bullet(x, @top + @height * .2, @facing)
                world.bullets.push(b)
                world.physics.addGameObj(b)
                # Projectiles are heavy and fast
                world.physics.scaleMass(b, 2000)
                b.physicsBody.GetFixtureList().SetRestitution(0)
                b.physicsBody.SetLinearVelocity(new b2Vec2(b.velocity, 0))
                b.physicsBody.SetBullet(true)
                @shotsFired++
                # Firing rate
                @firing = frameRate / shotsPerSecond
        @firing-- if (@firing > 0)
        @firing = 0 if (@firing < 0)

    lookForTarget: () ->
        centerX = @left + @width / 2
        centerY = @top + @height / 3
        rayLength = 10 * @width  / world.physics.scale
        start = new b2Vec2(centerX / world.physics.scale, centerY / world.physics.scale)
        end = new b2Vec2(@facing * rayLength, 0)
        end.Add(start)
        hitFixture = world.physics.physicsWorld.RayCastOne(start, end)
        hitBody = hitFixture?.GetBody()
        return hitBody?.GetUserData()

    draw: (ctx) ->
        return super(ctx) if (@beingPortaled)

        centerX = @left + @width / 2
        centerY = @top + @height / 2

        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(@angle)   # If the turret is tilted, tilt it over

        # We start by drawing the legs and the gun barrel
        ctx.beginPath()
        ctx.moveTo(0, @height * .1)
        ctx.lineTo(-.4 * @width, @height * .5)
        ctx.moveTo(0, @height * .1)
        ctx.lineTo(.4 * @width, @height * .5)
        ctx.moveTo(0, -.3 * @height)
        ctx.lineTo(@facing * @width * .5, -.3 * @height)
        ctx.stroke()
        # Then, draw two ovals, one to eliminate the lines under the body,
        # the other to do the body
        ctx.save()
        ctx.translate(0, -.1 * @height)
        ctx.scale(.5, 1) # Make an oval
        ctx.beginPath()
        ctx.fillStyle = "white"
        ctx.arc(0, 0, Math.min(@width, @height*.39), 0, Math.PI*2, false)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        ctx.restore()


class JumpPlate extends GameObj
    drawHeight: 5

    # To make it easier to say where a jump plate is, you specify left bottom when creating a new one
    # rather than top left.  Different than other GameObjs, but this makes it easier to put on platforms.
    # Note that a jump plate is only 1 pixel tall for the physics system, but 5 pixels for drawing
    constructor: (@left, @bottom, @facing = -1, @width = 15) ->
        @height = 1              # Height for physics system
        @top = @bottom - @height # Top for physics system
        @triggered = false
        @fixedRotation = true
        @angle = @lastAngle = 0

    update: () ->
        oldAngle = @angle
        if (@triggered)
            # Go up to 90 degrees, then back down more slowly
            if (!@angle or @lastAngle < @angle) then @angle += Math.PI / 9 else @angle -= Math.PI / 19
        else
            if (someBody = @somethingAbove())
                jumpPlateSpeed = 18
                if ((someBody is world.stickMan) or (someBody.canBePickedUp))
                    # Something is on top of us.  Launch it in the air.
                    @triggered = true
                    launchForce = jumpPlateSpeed * someBody.physicsBody.GetMass()
                    # We have a choice here between jump plate adding force and just overriding current velocity.
                    # The former is less predictable but adds a lot of interesting variability
                    # to the game.  The latter makes the jump plate always send you to the same spot,
                    # but means the levels need to be more carefully designed and makes the game play
                    # a little less creative. Go with adding force for now.
                    # someBody.physicsBody.SetLinearVelocity(new b2Vec2(@facing * launchForce * .9, -.7 * launchForce))
                    someBody.physicsBody.ApplyImpulse(new b2Vec2(@facing * launchForce, -launchForce), new b2Vec2(someBody.physicsBody.GetPosition().x, someBody.physicsBody.GetPosition().y))

        @lastAngle = oldAngle
        # Stop at 90 degrees and reverse, stop at 0 degrees and reset trigger
        @angle = @lastAngle = Math.PI / 2 if (@angle >= Math.PI / 2)
        @angle = @lastAngle = @triggered = 0 if (@angle < 0)

    draw: () ->
        # A plate is a little clear rectangle with a smaller black rectangle on top
        ctx.save()
        t = @bottom - @drawHeight
        h = @drawHeight
        if (@facing > 0)
            # This jump plate pushes the player to the right
            # It rotates from the bottom right corner up to 90 degrees
            ctx.translate(@left+@width, t+h)
            ctx.rotate(@angle)
            ctx.fillRect(-@width, -h, @width * .3, h/2)
            ctx.strokeRect(-@width, -h/2, @width, h/2)
        else
            # This jump plate pushes the player to the left
            # It rotates from the left bottom corner up to -90 degrees
            ctx.translate(@left, t+h)
            ctx.rotate(-@angle)
            ctx.fillRect(@width * .7, -h, @width * .3, h/2)
            ctx.strokeRect(0, -h/2, @width, h/2)
        ctx.restore()

    somethingAbove: () ->
        rayLength = .1     # Look a short distance above us
        start = @physicsBody.GetPosition()
        end = new b2Vec2(0, -rayLength)
        end.Add(start)
        hitFixture = world.physics.physicsWorld.RayCastOne(start, end)
        hitBody = hitFixture?.GetBody()
        return hitBody?.GetUserData()


class Platform extends GameObj
    constructor: (@left, @top, @width = 100, @height = 3) ->
        @fixedRotation = true
        @fillColor = "#333333"

    draw: () ->
        ctx.save()
        ctx.fillStyle = @fillColor
        ctx.fillRect(@left, @top, @width, @height)
        ctx.restore()


class Wall extends Platform
    constructor: (@left, @top, @width, @height) ->
        super
        @fillColor = "#999999"


class Portal extends GameObj
    constructor: (@centerX, @centerY, @angle = 0, @isBlue = true) ->
        @width = 40
        @height = 10
        @velocity = 30
        @left = @centerX - @width / 2
        @top = @centerY - @height / 2
        @fixedRotation = true
        @attached = false
        @age = 0

    somethingAhead: () ->
        rayLength = 1.2 * @velocity  / world.physics.scale
        start = new b2Vec2(@centerX / world.physics.scale, @centerY / world.physics.scale)
        end = new b2Vec2(rayLength * Math.cos(@angle), rayLength * Math.sin(@angle))
        end.Add(start)
        hitFixture = world.physics.physicsWorld.RayCastOne(start, end)
        hitBody = hitFixture?.GetBody()
        return hitBody?.GetUserData()

    update: () ->
        @age++
        # Portals don't exist in the physic sim, we do everything here
        # Move the portal if it should be moving
        if (@velocity)
            if (someBody = @somethingAhead())
                # Are we about to collide with something? If a platform, stick to it, otherwise destroy ourselves
                if (someBody in world.platforms)
                    # Orient ourselves to the platform and stick to it
                    # Start by finding out where we hit the platform
                    newY = someBody.top
                    @onTop = true
                    if (@centerY > someBody.top)
                        # We hit the bottom of the platform
                        newY += someBody.height
                        @onTop = false
                    # We need to end up at the top or bottom of the platform, but how far along we go
                    # horizontally needs to be calculated
                    diffY = newY - @centerY
                    diffX = @velocity * Math.cos(@angle)
                    diffX = diffY * Math.cos(@angle) / Math.sin(@angle) if (Math.sin(@angle) isnt 0)
                    @centerX += diffX
                    @centerY = newY
                    @left = @centerX - @width / 2
                    @top = @centerY - @height / 2
                    @velocity = 0
                    @angle = 0
                    # Need to make sure we are actually on the platform and not on another portal
                    if ((@centerX > someBody.left + someBody.width - @width/3) or (@centerX < someBody.left + @width/3) or (x for x in world.portals when x isnt this and Math.abs(@centerX - x.centerX) < @width and @onTop is x.onTop and Math.abs(@centerY - x.centerY) < 0.5).length)
                        # Oops, missed the platform or on top of another portal.  Blow ourselves up.
                        world.portals.remove(this)
                    else
                        @attached = true
                else
                    # Hit something else.  Portals only stick to platforms, so time to blow ourselves up
                    world.portals.remove(this)
            else
                # Nothing in front of us, so just move forward
                @centerX += @velocity * Math.cos(@angle)
                @centerY += @velocity * Math.sin(@angle)
                @left = @centerX - @width / 2
                @top = @centerY - @height / 2

        # If this portal is ready to portal stuff
        if (@attached and (x for x in world.portals when x.isBlue isnt @isBlue and x.attached).length)
            # Check if a portalable object is on top of us.  If so, suck it in and eject it from the other portal
            for obj in [world.stickMan].concat(world.boxes, world.turrets)
                objCenterX = obj.left + obj.width / 2
                if (obj.canBePortaled and !obj.beingPortaled and !obj.justPortaled and !obj.exiting)
                    if (Math.abs(objCenterX - @centerX) < @width * .6)
                        objRelevantY = obj.top
                        objRelevantY += obj.height if (@onTop)
                        if (Math.abs(objRelevantY - @centerY) < @height * 2)
                            # The object should be sucked through
                            # Remove it from the physics sim, mark it as being portaled
                            obj.physicsBody.SetActive(false)
                            obj.beingPortaled = 1
                            obj.gotoPortal = (x for x in world.portals when x isnt this)[0]
                            obj.fromPortal = this

    draw: (ctx) ->
        ctx.save()
        ctx.translate(@centerX, @centerY)
        ctx.rotate(@angle)
        # Draw an oval, so change the scale on one axis
        ctx.scale(1, @height/@width)
        # Grow the portal as it flies through the air
        sizeFlux = .5 * Math.min(@age, 16) / 16
        ctx.scale(.5 + sizeFlux, .5 + sizeFlux) if (!@attached)
        radsize = @width/2
        # Radial gradients do not seem to work with negative values, so translate the
        # axis instead
        ctx.translate(-radsize, -radsize)
        radgrad = ctx.createRadialGradient(radsize,radsize,0,radsize,radsize,radsize)
        # Two portals in the world, one blue, one orange
        if (@isBlue)
            radgrad.addColorStop(0, 'rgba(155,185,255,0)')
            radgrad.addColorStop(0.4, 'rgba(122,152,255,.6)')
            radgrad.addColorStop(0.6, 'rgba(211,241,255,1)')
            radgrad.addColorStop(0.8, 'rgba(122,152,255,.9)')
            radgrad.addColorStop(1, 'rgba(155,185,255,0)')
        else
            radgrad.addColorStop(0, 'rgba(255,185,155,0)')
            radgrad.addColorStop(0.4, 'rgba(255,185,15,.6)')
            radgrad.addColorStop(0.6, 'rgba(255,245,215,1)')
            radgrad.addColorStop(0.8, 'rgba(255,185,15,.9)')
            radgrad.addColorStop(1, 'rgba(255,185,155,0)')
        ctx.fillStyle = radgrad
        ctx.fillRect(0, 0, @width, @width)
        ctx.restore()


class EditWheel extends GameObj
    constructor: (@centerX, @centerY) ->
        @items = [
            new Platform(@centerX-20, @centerY+10, 40),
            new Turret(@centerX-40, @centerY-30),
            new Box(@centerX-15, @centerY-40),
            new JumpPlate(@centerX+25, @centerY)]

    draw: (ctx) ->
        ctx.save()
        ctx.fillStyle = ctx.strokeStyle = "#777777"
        i.draw(ctx) for i in @items
        ctx.restore()



# This is just a bucket to hold most of the code related to the
# physics sim, which runs beside the drawing sim and is used to update
# the position of objects.
#
# One thing to note about this physics sim is that it refers to
# objects using their center (x,y), then radius (or half width and
# height) out from that.  The canvas wants top left corner and then
# width and height from that, so there's conversions all over the
# place to map between the two.
#
# TO DO: Is there a better way to do this?  If you aggressively use transforms,
# for example, can you get the canvas to use center (x,y) and use that everywhere?

class Physics
    defaultFriction = 0.6
    # Seems like scale shouldn't matter, but it does.  The physics sim behaves poorly
    # at very large and very small scale.  Odd, yes, but we have to deal with it.
    scale: 30.0

    constructor: () ->
        gravity = new b2Vec2(0, 20)
        doSleep = true
        @physicsWorld = new b2World(gravity, doSleep)

    createFixture = (shape) ->
        fixture = new b2FixtureDef()
        fixture.density = 3
        fixture.friction = defaultFriction
        fixture.restitution = .3
        fixture.shape = shape
        return fixture

    createBody = (x, y) ->
        b = new b2BodyDef
        b.position.Set(x, y)
        b.type = b2Body.b2_dynamicBody
        b.linearDamping = .01
        b.angularDamping = .01
        return b

    createRect: (x, y, w, h, a, isStatic = false) ->
        # x,y need to be center position of rect. w,h should be distance from center.
        fixDef = createFixture(new b2PolygonShape)
        bodyDef = createBody(x, y)
        bodyDef.type = b2Body.b2_staticBody if (isStatic)
        if (a == null)
            bodyDef.fixedRotation = true
        else
            bodyDef.angle = a
        fixDef.shape.SetAsBox(w, h)
        return @create(bodyDef, fixDef)

    createCircle: (x, y, r, a) ->
        # x,y need to be center position of rect. r should be distance from center.
        fixDef = createFixture(new b2CircleShape(r))
        bodyDef = createBody(x, y)
        if (a == null)
            bodyDef.fixedRotation = true
        else
            bodyDef.angle = a
        return @create(bodyDef, fixDef)

    create: (bodyDef, fixDef) ->
        body = @physicsWorld.CreateBody(bodyDef)
        body.CreateFixture(fixDef)
        return body

    addGameObj: (obj, useCircle = false, isStatic = false) ->
        width = (obj.width/@scale) / 2
        height = (obj.height/@scale) / 2
        centerX = obj.left/@scale + width
        centerY = obj.top/@scale + height
        angle = obj.angle
        angle = null if obj.fixedRotation
        if (useCircle)
            obj.physicsBody = @createCircle(centerX, centerY, Math.max(height, width), angle)
        else
            obj.physicsBody = @createRect(centerX, centerY, width, height, angle, isStatic)
        obj.physicsBody.SetUserData(obj)

    debugInit: ->
        debugDraw = new b2DebugDraw()
        debugDraw.SetSprite(ctx)
        debugDraw.SetDrawScale(@scale)
        debugDraw.SetLineThickness(1.0)
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit)
        @physicsWorld.SetDebugDraw(debugDraw)

    debugDraw: ->
        ctx.save()
        @physicsWorld.DrawDebugData()
        ctx.restore()

    update: ->
        # Seems like this works best when steps are 1/60 or so, but mobile devices
        # have weaker CPUs, so limit to 1/30 on mobile
        numIterations = 2
        numIterations = 1 if @onMobile

        for i in [1..numIterations]
            @physicsWorld.Step(1 / (frameRate * numIterations), 10, 10)
            @physicsWorld.ClearForces()

    updateGameObjPosition: (obj) ->
        # Update position and angle based on the physics simulation
        b = obj.physicsBody
        # Reverse scaling and move center coordinates to top left
        obj.left = b.GetPosition().x * @scale - obj.width/2
        obj.top = b.GetPosition().y * @scale - obj.height/2
        obj.angle = b.GetAngle()

    addStickMan: (stickMan) ->
        @addGameObj(stickMan, true)
        stickMan.physicsBody.SetSleepingAllowed(false)
        stickMan.physicsBody.GetFixtureList().SetRestitution(0)

    addTurret: (t) ->
        # A turret is represented in the physics sim by a box with a circle on top, like a little playmobile
        # character, which keeps the turret from being able to do odd things like stand easily on its head
        w = t.width / @scale / 2
        h = t.height / @scale / 2
        centerX = t.left / @scale + w
        centerY = t.top / @scale + h
        # Start by defining the box and circle fixtures
        boxFixDef = createFixture(b2PolygonShape.AsOrientedBox(w, h/2, new b2Vec2(0, h/2)))
        circleFixDef = createFixture(new b2CircleShape(Math.min(w, h/2)))
        circleFixDef.shape.SetLocalPosition(new b2Vec2(0, -h/2))
        # Then create the body and attach the two fixtures
        bodyDef = createBody(centerX, centerY)
        bodyDef.angle = t.angle
        body = @physicsWorld.CreateBody(bodyDef)
        body.CreateFixture(boxFixDef)
        body.CreateFixture(circleFixDef)
        # Finally, as we do for all objects, make the physics object point at the game object and visa-versa
        body.SetUserData(t)
        t.physicsBody = body


    findObjToPickup: (stickMan) ->
        # Shoot a ray from the angle of the portal gun.  If it hits a box, return that box
        rayLength = .9 * stickMan.width / @scale  # Pick up a box if it isn't too far
        start = stickMan.physicsBody.GetPosition()
        a = stickMan.armAngle  # Rotate the ray through the arm angle
        end = new b2Vec2(rayLength * Math.cos(a), rayLength * Math.sin(a))
        end.Add(start)
        hitFixture = @physicsWorld.RayCastOne(start, end)
        hitBody = hitFixture?.GetBody()
        return null if (!hitBody)
        hitBody = null if (!hitBody.GetUserData().canBePickedUp)
        return hitBody?.GetUserData()

    attachStickmanHeldObj: (stickMan, heldObj) ->
        jointDef = new b2DistanceJointDef()
        # We need the joint to be at the end of the portal gun, not just to the center of the man, and
        # the portal gun has an angle to it, so use that.
        l = .8 * stickMan.width / @scale     # Approximate length of the portal gun
        a = stickMan.armAngle
        endOfPortalGun = new b2Vec2(l * Math.cos(a), l * Math.sin(a))  # Use the angle of the portal gun
        endOfPortalGun.Add(stickMan.physicsBody.GetPosition())
        jointDef.Initialize(stickMan.physicsBody, heldObj.physicsBody, endOfPortalGun, heldObj.physicsBody.GetPosition())
        jointDef.frequencyHz = 1.0   # How often the springiness if the joint springs, should be low
        jointDef.length = .2 * heldObj.width / @scale  # Should reach the edge of the heldObj
        jointDef.dampingRatio = .1   # How springy the joint is, low is more springy
        jointDef.collideConnected = true
        heldObj.physicsBody.GetFixtureList().SetFriction(0)  # Let the object slide easily
        stickMan.heldObjJoint = @physicsWorld.CreateJoint(jointDef)
        stickMan.heldObj = heldObj

    releaseStickmanHeldObj: (stickMan, heldObj) ->
        @physicsWorld.DestroyJoint(stickMan.heldObjJoint) if (stickMan.heldObjJoint)
        stickMan.heldObj.physicsBody.GetFixtureList().SetFriction(defaultFriction)
        stickMan.heldObj = null
        stickMan.heldObjJoint = null

    updateStickmanHeldObj: (stickMan, heldObj) ->
        # We need to keep recreating the spring attaching these two because the arm angle can change.
        # This would be cleaner if there was a way to update the anchor point, but there is not (without
        # being naughty and touching the private members of b2DistanceJoint)
        @releaseStickmanHeldObj(stickMan, heldObj)
        @attachStickmanHeldObj(stickMan, heldObj)

    scaleMass: (obj, scale) ->
        data = new b2MassData()
        obj.physicsBody.GetMassData(data)
        data.mass *= scale
        obj.physicsBody.SetMassData(data)



# The world holds the entire simulation, all the objects in the world,
# how to create worlds, and a pointer to the physics sim that runs
# beside everything and updates positions of objects.
# TO DO: Kind of Java-like to use a class for this when this is really just
# a bucket of stuff organized together. Fine, but might be a better way of
# doing it.

class World
    constructor: () ->
        @level = 0
        @init()

    # Because of the need to scale the canvas to different window sizes in browsers and on
    # mobile devices, there is an assumption that the world is 600 x 400 in all the code below.
    # TO DO: This is this way mostly due to ineria, is there a cleaner way to do this? Fractional
    # distances? That'd be ugly. Seems really unclean to use 600 x 400 as the assumed virtual
    # canvas, but not clear there is an obvious better way.  Think about it more, please.
    initExitTutorial: () ->

    initPortalTutorial: () ->
        @platforms = [new Platform(80,320,200), new Platform(400,80,180)]
        @exit = new Exit(530,130)

    initBoxesTutorial: () ->
        for i in [8..10]
            box = new Box(100 + 35 * i, 50, Math.PI/10 * Math.random())
            @boxes.push(box)
        @exit = new Exit(530,240)

    initJumpPlatesTutorial: () ->
        @jumpPlates = [new JumpPlate(280, 400, 1)]
        @exit = new Exit(450,140)

    initTurretTutorial: () ->
        @boxes = [new Box(300,150)]
        @turrets = [new Turret(480,360)]

    initMainLevel: () ->
        @stickMan = new Man(300,200)
        @exit = new Exit(450,30)
        @platforms = [new Platform(80,250,200), new Platform(300,320,150)]
        @jumpPlates = [new JumpPlate(400,320), new JumpPlate(100,250,1), new JumpPlate(150,400,1)]
        for i in [6..10]
            box = new Box(100 + 35 * i,50, Math.PI/10 * Math.random())
            @boxes.push(box)
        @turrets.push(new Turret(250,220))

    initTerminalVelocityLevel: () ->
        # This is a test to see what happens if you have a fall from one portal to another over and over.
        # Short answer is that it does not work quite right yet, you appear to bounce off the floor
        # under one of the portals.  Maybe it is the delay before being able to portal again?
        # Maybe ignoring the delay when the velocity is high enough?
        @platforms = [new Platform(200,320,180), new Platform(200,80,180)]
        @jumpPlates = [new JumpPlate(20, 400, 1)]

    initBoxPileLevel: () ->
        for j in [1..5]
            for i in [j..10]
                box = new Box(100 + 35 * i,35 * j, Math.PI/10 * Math.random())
                @boxes.push(box)
        @exit = new Exit(530,240)

    initJumpJumpJumpLevel: () ->
        @exit = new Exit(290,20)
        @stickMan = new Man(150,100)
        for i in [0..3]
            @boxes.push(new Box(300,100+35*i))
        for i in [0..1]
            for j in [0..4]
                @platforms.push(new Platform(0 + 520 * i, 60 + 85 * j, 80)) if (j isnt 4)
                @jumpPlates.push(new JumpPlate(65 + 455 * i, 59 + 85 * j, 1-2*i))

    initJumpThroughSomeBulletsLevel: () ->
        @exit = new Exit(290,20)
        @stickMan = new Man(150,100)
        for i in [0..3]
            @boxes.push(new Box(300,100+35*i))
        for i in [0..1]
            for j in [0..4]
                @platforms.push(new Platform(0 + 520 * i, 60 + 85 * j, 80)) if (j isnt 4)
                @turrets.push(new Turret(15 + 555 * i,29 + 85 * j, 1-2*i)) if (j is 4)
                @jumpPlates.push(new JumpPlate(65 + 455 * i, 59 + 85 * j, 1-2*i))

    initJumpThroughBulletsLevel: () ->
        @exit = new Exit(290,20)
        @stickMan = new Man(150,100)
        for i in [0..3]
            @boxes.push(new Box(300,100+35*i))
        for i in [0..1]
            for j in [0..4]
                @platforms.push(new Platform(0 + 520 * i, 60 + 85 * j, 80)) if (j isnt 4)
                @turrets.push(new Turret(15 + 555 * i,29 + 85 * j, 1-2*i))
                @jumpPlates.push(new JumpPlate(65 + 455 * i, 59 + 85 * j, 1-2*i))

    init: () ->
        w = virtualCanvasWidth
        h = virtualCanvasHeight
        t = 2 # Thickness
        @walls = [new Wall(0,0,w,t), new Wall(0,h-t,w,t), new Wall(0,0,t,h), new Wall(w-t,0,t,h)]
        @stickMan = new Man(50,100)
        @exit = new Exit(530,290)
        @platforms = []
        @jumpPlates = []
        @boxes = []
        @turrets = []
        @portals = []
        @bullets = []

        @level++
        @level = 6 if @level > 10
        switch @level
            when 1
                @initExitTutorial()
            when 2
                @initJumpPlatesTutorial()
            when 3
                @initPortalTutorial()
            when 4
                @initBoxesTutorial()
            when 5
                @initTurretTutorial()
            when 6
                @initBoxPileLevel()
            when 7
                @initJumpJumpJumpLevel()
            when 8
                @initJumpThroughSomeBulletsLevel()
            when 9
                @initJumpThroughBulletsLevel()
            else
                @initMainLevel()

        @initPhysics()

    initPhysics: () ->
        @physics = new Physics()
        @physics.onMobile = navigator.appVersion.indexOf("Mobile") >= 0
        @physics.addGameObj(p, false, true) for p in @platforms
        @physics.addGameObj(w, false, true) for w in @walls
        @physics.addGameObj(j, false, true) for j in @jumpPlates
        @physics.addGameObj(b) for b in @boxes
        @physics.addStickMan(@stickMan)
        @physics.scaleMass(@stickMan, 3)
        @physics.addTurret(t) for t in @turrets
        @physicsDebug = false
        @physics.debugInit() if (@physicsDebug)

    update: () ->
        if @editTriggered
            if @paused
                @paused = false
            else
                @paused = true
                @init()
            @editTriggered = false
        if @resetOnNextUpdate
            @init()
            @resetOnNextUpdate = false

        # Bring up the edit wheel if we get a mouse down when we are paused.
        # Make it go away again on another mouse down.
        # Also make sure edit wheel is gone if we are not paused.
        if @paused
            if @mouseDown
                if @editWheel
                    @editWheel = null
                else
                    @editWheel = new EditWheel(@mouseX, @mouseY)
                @mouseDown = false
            return
        else
            @editWheel = null if @editWheel

        # Update the physics sim.  This should come before updating game objects.
        @physics.update()
        # Call update on all game objects
        x.update() for x in [].concat(@stickMan, @exit, @boxes, @platforms, @walls, @turrets, @jumpPlates, @portals, @bullets)

    draw: (ctx) ->
        # Make the canvas (mostly) fill the window
        if (@windowInnerWidth isnt window.innerWidth or @windowInnerHeight isnt window.innerHeight)
            # It is expensive to change the canvas, only do it when the window
            # has resized since the last time we did this.
            @windowInnerWidth = window.innerWidth
            @windowInnerHeight = window.innerHeight
            w = @windowInnerWidth
            w -= 10 if w >= 20  # Leave a little margin if we can
            w = 900 if w > 900  # Don't make it too big even if we have room
            h = w * 2 / 3
            if (h > @windowInnerHeight - 10)
                h = @windowInnerHeight
                h -= 10 if h >= 20
                w = h * 1.5
            ctx.canvas.width  = w
            ctx.canvas.height = h
            # Center the canvas in the window, but keep the canvas closer to the top
            ctx.canvas.style.left = ((@windowInnerWidth - w) / 2) + "px"
            ctx.canvas.style.top = Math.max(5, (@windowInnerHeight - h) / 3) + "px"

        w = ctx.canvas.width
        h = ctx.canvas.height
        ctx.clearRect(0, 0, w, h)
        ctx.save()
        ctx.scale(w / virtualCanvasWidth, w / virtualCanvasWidth)
        @physics.debugDraw() if (@physicsDebug)
        @redraw(ctx)
        ctx.restore()

    redraw: (ctx) ->
        # Re-draw all game objects
        x.draw(ctx) for x in [].concat(@stickMan, @exit, @boxes, @platforms, @walls, @turrets, @jumpPlates, @portals, @bullets)
        @editWheel.draw(ctx) if (@editWheel)

    # TO DO: Need to write save and load functions here
    # (is this as simple as calling toJSONString()? Might be if you can avoid cycles, but there
    # are cycles in the physics stuff and between the world and physics objects)


# Globals
world = null        # Global for holding world state
ctx = null          # Global to hold canvas context (and avoid lots of lookups)

# Convenience globals
b2Vec2 = Box2D.Common.Math.b2Vec2
b2AABB = Box2D.Collision.b2AABB
{b2BodyDef, b2Body, b2FixtureDef, b2Fixture, b2World, b2DebugDraw} = Box2D.Dynamics
{b2PolygonShape, b2CircleShape, b2MassData} = Box2D.Collision.Shapes
b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef

# Constants
arrowKeys = {left: 37, up: 38, right: 39, down: 40}
wasdKeys = {a: 65, s: 83, w: 87, d: 68}
modifierKeys = {shift: 16, cntl: 17}
escKey = 27
frameRate = 30      # Frames per second
stickManTryToJumpForNumFrames = 6
virtualCanvasWidth = 600
virtualCanvasHeight = 400

# Convenience functions
after = (ms, cb) -> setTimeout cb, ms
every = (ms, cb) -> setInterval cb, ms
randomInt = (a) -> Math.floor Math.random() * a
Array::remove = (e) -> @[t..t] = [] if (t = @indexOf(e)) > -1
Array::filterOutValue = (v) -> x for x in @ when x isnt v

initGamePlayDemo = () ->
    ctx = document.getElementById('mainCanvas')?.getContext('2d')

    world = new World()
    world.draw(ctx)
    document.onkeydown = handleKeyDown
    document.onkeyup = handleKeyUp
    document.onmousemove = handleMouseMove
    document.onmousedown = handleMouseDown
    # Disable right click context menu
    document.oncontextmenu = (evt) -> evt.preventDefault()
    if navigator.appVersion.indexOf("Mobile") >= 0
        # We are on a mobile device
        # Convert touch events on mobile devices into mouse-like events
        document.ontouchstart = handleTouchStart
        document.ontouchmove = handleTouchMove
        document.ontouchend = handleTouchEnd
        document.ontouchcancel = handleTouchEnd
        # Modern mobile devices send orientation events.  Capture and use them.
        window.ondeviceorientation = handleDeviceOrientation
        # Disable pinch events and other gestures on iPhone
        # document.ongesturestart = (evt) -> evt.preventDefault()
        # document.ongesturechange = (evt) -> evt.preventDefault()
        # Force the app to be in landscape mode
        window.onorientationchange = handleOrientationChange

    updateWorld()

# Target updating at the frameRate (but assume updates are instant, so we won't quite get to the requested frameRate)
updateWorld = () ->
        world.update()
        world.draw(ctx)
        after(1000/frameRate, updateWorld)


# Keyboard and mouse (and touch and accelerometer) events primarily impact
# the stickMan when playing the game and selections/edits in the editor
# Should not do heavy processing in event handlers, do most of the work in the
# stickMan's update() and redraw() calls in the next frame

handleKeyDown = (evt) ->
    stickMan = world.stickMan

    switch evt.keyCode
        when arrowKeys.left,wasdKeys.a
            stickMan.running = true
            stickMan.facing = -1
            return false
        when arrowKeys.up,wasdKeys.w
            stickMan.jumping = stickManTryToJumpForNumFrames
            return false
        when arrowKeys.right,wasdKeys.d
            stickMan.running = true
            stickMan.facing = 1
            return false
        else
            return true

handleKeyUp = (evt) ->
    stickMan = world.stickMan

    switch evt.keyCode
        when arrowKeys.left, arrowKeys.right, wasdKeys.a, wasdKeys.d
            stickMan.running = false
            return false
        when arrowKeys.up, wasdKeys.w
            return false
        when escKey
            # TO DO: Disable edit mode for now, this is future work
            # world.editTriggered = true
        else
            return true

handleMouseMove = (evt) ->
    # Store the location of the mouse (in canvas scaled and translated coordinates)
    # whenever the mouse moves
    # Deal with scaling the canvas for window size (assumed window width is 600 pixels, assumed ratio w:h is 3:2)
    # Also deal with translation of the canvas in the window (from trying to center it)
    world.mouseX = (evt.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
    world.mouseY = (evt.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width

handleMouseDown = (evt) ->
    world.mouseDown = true

    evt.preventDefault()



# Touch controls are hard because we have fewer clean control events (like keys, mouse move, and mouse
# click).  Here are some ways this could work:
# (1) Short vs. long touch: Long touch is move to touch, short touch aims and fires, second long touch aims
# (2) Screen controls: Touches on left side of screen move, on right touches aim and release fires
# (3) Tilt + touch: Tilt moves, touch aims and brief touch end fires
# Of these, (2) is the most common, but also yields a pretty lame experience.  Code for all three
# are attempted below with a way to easily switch between them in the code.
# [Another idea: First touch moves toward mouse, second touch aims, second brief touch fires]
#
# After user testing, the first of these works the best (though (3) is pretty cool, just hard
# to control).  So, let's use the first all the time.  Keep the other code around in case
# we change our mind.
touchControlUI = 1

handleTouchStartOrEndMethod1Helper = (evt) ->
    stickMan = world.stickMan
    x = (evt.touches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
    y = (evt.touches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
    minBeforeMove = 10  # In pixels
    x -= stickMan.left + stickMan.width / 2
    y -= stickMan.top + stickMan.height / 2
    # Assume this is moving or jumping
    # If this is mostly above us, assume its a jump
    if (y < -minBeforeMove and Math.abs(x) < -y / 5)
        stickMan.jumping = stickManTryToJumpForNumFrames
    else
        if (x > minBeforeMove)
            stickMan.running = true
            stickMan.facing = 1
        else if (x < -minBeforeMove)
            stickMan.running = true
            stickMan.facing = -1
        else
            stickMan.running = false
    # If we have a second touch, aim the portal gun at it
    if (evt.touches.length > 1 and (evt.changedTouches.length > 1 or evt.changedTouches[0].identifier is evt.touches[1].identifier))
        world.mouseX = (evt.touches[1].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
        world.mouseY = (evt.touches[1].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width

handleTouchStart = (evt) ->
    stickMan = world.stickMan

    stickMan.touchedDuration = 1
    if (touchControlUI is 3)
        x = (evt.changedTouches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
        y = (evt.changedTouches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
        # Aim the portal gun at the touch
        world.mouseX = x
        world.mouseY = y
    else if (touchControlUI is 2)
        for t in evt.changedTouches
            x = (t.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
            y = (t.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
            if (x < virtualCanvasWidth / 2)
                if (y < 100)
                    # Jump
                    stickMan.jumping = stickManTryToJumpForNumFrames
            else
                # Aim the portal gun, rescaling the right half of the screen to the whole screen
                world.mouseX = (x - virtualCanvasWidth / 2) * 2
                world.mouseY = y
    else if (touchControlUI is 1)
        handleTouchStartOrEndMethod1Helper(evt)

    evt.preventDefault()

handleTouchMove = (evt) ->
    stickMan = world.stickMan

    # Get the x and y of the touch event relative to the center of the stick man
    # Deal with scaling the canvas for window size (assumed window width is 600 pixels, assumed ratio w:h is 3:2)
    # Also deal with translation of the canvas in the window (from trying to center it)
    if (touchControlUI is 3)
        x = (evt.changedTouches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
        y = (evt.changedTouches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
        world.mouseX = x
        world.mouseY = y
    else if (touchControlUI is 2)
        for t in evt.changedTouches
            x = (t.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
            y = (t.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
            # Touches in the left half of the screen move, touches in right half aim
            if (x < virtualCanvasWidth / 2)  # Assumed window width is 600, see code above
                # First 1/6th of the screen means run left, second 1/6th means stay still, third 1/6th is run right
                if (x < 100)
                    stickMan.running = true
                    stickMan.facing = -1
                else if (x > 200)
                    stickMan.running = true
                    stickMan.facing = 1
                else
                    stickMan.running = false
                # Jump if the touch is in the top half of the screen
                if (y < 100)
                    stickMan.jumping = stickManTryToJumpForNumFrames
            else
                # Aim the portal gun, rescaling the right half of the screen to the whole screen
                world.mouseX = (x - virtualCanvasWidth / 2) * 2
                world.mouseY = y
    else if (touchControlUI is 1)
        handleTouchStartOrEndMethod1Helper(evt)

    evt.preventDefault()

handleTouchEnd = (evt) ->
    stickMan = world.stickMan

    # If the touch wasn't down for long, treat this like activating the portal gun toward the
    # touch location
    x = (evt.changedTouches[0].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
    y = (evt.changedTouches[0].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
    if (touchControlUI is 1)
        # Aim the portal gun at a brief touch and fire
        if (stickMan.touchedDuration < frameRate / 5)
            world.mouseX = x
            world.mouseY = y
            world.mouseDown = true
        if (evt.touches.length <= 1)
            # If we are ending the last touch, stop running
            stickMan.running = false
            stickMan.touchedDuration = 0
    else if (touchControlUI is 2)
        for t in evt.changedTouches
            x = (t.clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
            y = (t.clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
            # Stop running if this was on the left side
            if (x < virtualCanvasWidth / 2)
                stickMan.running = false
            # Fire the portal gun if this is a brief touch in the right side, but do not change the angle
            if (x >= virtualCanvasWidth / 2 and stickMan.touchedDuration < frameRate / 5)
                world.mouseDown = true
    else if (touchControlUI is 3)
        # Aim the portal gun at a brief touch mouse and fire
        if (stickMan.touchedDuration < frameRate / 5)
            world.mouseX = x
            world.mouseY = y
            # If we have a second touch, aim the portal gun at it instead
            if (evt.changedTouches.length > 1)
                world.mouseX = (evt.changedTouches[1].clientX - ctx.canvas.offsetLeft) * virtualCanvasWidth / ctx.canvas.width
                world.mouseY = (evt.changedTouches[1].clientY - ctx.canvas.offsetTop) * virtualCanvasWidth / ctx.canvas.width
            world.mouseDown = true

    evt.preventDefault()

handleDeviceOrientation = (evt) ->
    return true if (touchControlUI isnt 3)

    stickMan = world.stickMan
    upTilt = evt.beta
    rightTilt = evt.gamma
    switch window.orientation
        when 90
            # Swap these since we are in landscape mode
            [upTilt, rightTilt] = [-rightTilt, upTilt]
        when -90
            # Swap these since we are in reverse landscape mode
            [upTilt, rightTilt] = [rightTilt, -upTilt]
    if (Math.abs(rightTilt) > 15)
        # More than 15 degree tilt, start running in the direction of the tilt
        stickMan.running = true
        stickMan.facing = if (rightTilt > 0) then 1 else -1
    else
        stickMan.running = false
    if (upTilt < 30)
        stickMan.jumping = stickManTryToJumpForNumFrames
    evt.preventDefault()

handleOrientationChange = (evt) ->
    # This could look at window.orientation and set the CSS for the body to "-webkit-transform: rotate(90deg)"
    # or whatever rotation is appropriate to keep it in landscape.  Might also want to use
    # "-webkit-transition: all 1s ease-in-out;" to make the rotation back match the rotation effect Safari
    # forces on us.  Or not, we could just punt on all that and just make the experience in portrait okay
    # and experience in landscape great.  For now, let's punt on all that.
    evt.preventDefault()
