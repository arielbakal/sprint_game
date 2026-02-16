// =====================================================
// COMBAT SYSTEM - Player attack, creature aggro/contact,
//                 death/respawn, stat boosts
// =====================================================

import {
    PLAYER_BASE_ATTACK,
    ATTACK_COOLDOWN, ATTACK_RANGE, ATTACK_ARC,
    CREATURE_CONTACT_DAMAGE, CREATURE_CONTACT_COOLDOWN, CREATURE_AGGRO_DURATION,
    RESPAWN_INVINCIBILITY, PLAYER_RADIUS,
    STAT_BOOST_PICKUP_RANGE, STAT_BOOST_BOB_SPEED, STAT_BOOST_BOB_HEIGHT, STAT_BOOST_SPIN_SPEED
} from '../constants.js';

export default class CombatSystem {
    constructor(ui) {
        this.ui = ui;
        this._flashTimers = []; // entity flash timers for damage feedback
    }

    update(dt, ctx) {
        const { state } = ctx;

        // Tick attack cooldown
        if (state.attackCooldown > 0) state.attackCooldown -= dt;

        // Tick invincibility
        if (state.invincibleTimer > 0) state.invincibleTimer -= dt;

        // Clear attack flag after brief window
        if (state.isAttacking) {
            state._attackVisualTimer = (state._attackVisualTimer || 0) + dt;
            if (state._attackVisualTimer > 0.3) {
                state.isAttacking = false;
                state._attackVisualTimer = 0;
            }
        }

        this._updateFlashTimers(dt);

        if (state.isDead) {
            this._updateDeathRespawn(dt, state);
            this._updateUI(state);
            return;
        }

        this._updateCreatureAggro(dt, state);
        this._updateCreatureContact(dt, state, ctx.audio);
        this._updateStatBoosts(dt, state, ctx.world, ctx.audio, ctx.factory, ctx.t);
        this._updateUI(state);
    }

    tryAttack(ctx) {
        const { state, audio, factory, world } = ctx;
        if (state.isDead) return false;
        if (state.attackCooldown > 0) return false;

        // Use player's attack stat (fists / boosted by stat pickups)
        const damage = state.player.attack || PLAYER_BASE_ATTACK;

        // Find targets in forward arc
        const targets = this._findAttackTargets(state);
        if (targets.length === 0) return false;

        state.attackCooldown = ATTACK_COOLDOWN;
        state.isAttacking = true;
        state._attackVisualTimer = 0;

        audio.chop(); // reuse chop sound for attack

        for (const entity of targets) {
            this._damageEntity(entity, damage, ctx);
        }

        return true;
    }

    _findAttackTargets(state) {
        const targets = [];
        const playerPos = state.player.pos;
        const playerRot = state.player.targetRotation;

        // Player forward direction
        const fwdX = Math.sin(playerRot);
        const fwdZ = Math.cos(playerRot);

        for (const e of state.entities) {
            if (e.userData.type !== 'creature') continue;
            if (e.userData.hp === undefined || e.userData.hp <= 0) continue;

            const dx = e.position.x - playerPos.x;
            const dz = e.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > ATTACK_RANGE) continue;

            // Check if within forward arc (dot product)
            if (dist > 0.01) {
                const ndx = dx / dist;
                const ndz = dz / dist;
                const dot = fwdX * ndx + fwdZ * ndz;
                if (dot < Math.cos(ATTACK_ARC / 2)) continue;
            }

            targets.push(e);
        }

        return targets;
    }

    _damageEntity(entity, damage, ctx) {
        const { state, world, factory, audio } = ctx;

        entity.userData.hp -= damage;

        // Flash red
        this._flashEntity(entity, 0xff0000, 0.2);

        // Knockback away from player
        const dx = entity.position.x - state.player.pos.x;
        const dz = entity.position.z - state.player.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        entity.position.x += (dx / dist) * 0.8;
        entity.position.z += (dz / dist) * 0.8;

        // Set aggro
        entity.userData.aggroTimer = CREATURE_AGGRO_DURATION;

        // Hit particles
        for (let i = 0; i < 6; i++) {
            factory.createParticle(entity.position.clone(), entity.userData.color || new THREE.Color(0xff0000), 0.8);
        }

        // Death check
        if (entity.userData.hp <= 0) {
            audio.die();
            for (let i = 0; i < 20; i++) {
                factory.createParticle(entity.position.clone(), entity.userData.color || new THREE.Color(0xff0000), 1.5);
            }
            world.remove(entity);
            const idx = state.entities.indexOf(entity);
            if (idx > -1) state.entities.splice(idx, 1);
            if (state.obstacles.includes(entity)) {
                state.obstacles.splice(state.obstacles.indexOf(entity), 1);
            }
        }
    }

    _flashEntity(entity, color, duration) {
        const originalEmissives = [];
        entity.traverse(child => {
            if (child.material && child.material.emissive) {
                originalEmissives.push({ mat: child.material, orig: child.material.emissive.getHex() });
                child.material.emissive.setHex(color);
            }
        });
        this._flashTimers.push({ originals: originalEmissives, timer: duration });
    }

    _updateFlashTimers(dt) {
        for (let i = this._flashTimers.length - 1; i >= 0; i--) {
            this._flashTimers[i].timer -= dt;
            if (this._flashTimers[i].timer <= 0) {
                for (const { mat, orig } of this._flashTimers[i].originals) {
                    mat.emissive.setHex(orig);
                }
                this._flashTimers.splice(i, 1);
            }
        }
    }

    _damagePlayer(amount, state, audio) {
        if (state.invincibleTimer > 0) return;
        if (state.isDead) return;

        state.player.hp -= amount;
        audio.hurt();

        // Red screen flash
        if (this.ui.flash) {
            this.ui.flash.style.background = 'rgba(255, 0, 0, 0.4)';
            this.ui.flash.style.opacity = 1;
            setTimeout(() => {
                this.ui.flash.style.opacity = 0;
                setTimeout(() => { this.ui.flash.style.background = '#fff'; }, 300);
            }, 150);
        }

        if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.isDead = true;
            state.deathTimer = 2.0;
            audio.die();
        }
    }

    _updateCreatureContact(dt, state, audio) {
        const playerPos = state.player.pos;

        for (const e of state.entities) {
            if (e.userData.type !== 'creature') continue;
            if (e.userData.aggroTimer <= 0) continue;

            // Contact cooldown
            e.userData.contactCooldown = (e.userData.contactCooldown || 0) - dt;
            if (e.userData.contactCooldown > 0) continue;

            // Distance check
            const dx = e.position.x - playerPos.x;
            const dz = e.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const contactDist = PLAYER_RADIUS + (e.userData.radius || 0.5);

            if (dist < contactDist) {
                e.userData.contactCooldown = CREATURE_CONTACT_COOLDOWN;
                this._damagePlayer(CREATURE_CONTACT_DAMAGE, state, audio);
            }
        }
    }

    _updateCreatureAggro(dt, state) {
        const playerPos = state.player.pos;

        for (const e of state.entities) {
            if (e.userData.type !== 'creature') continue;
            if (e.userData.aggroTimer <= 0) continue;

            e.userData.aggroTimer -= dt;

            // Chase player at 2x moveSpeed
            const dx = playerPos.x - e.position.x;
            const dz = playerPos.z - e.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 0.5) {
                const speed = (e.userData.moveSpeed || 0.03) * 2;
                e.position.x += (dx / dist) * speed;
                e.position.z += (dz / dist) * speed;
                e.lookAt(new THREE.Vector3(playerPos.x, e.position.y, playerPos.z));
            }
        }
    }

    _updateDeathRespawn(dt, state) {
        state.deathTimer -= dt;
        if (state.deathTimer <= 0) {
            state.isDead = false;
            state.player.hp = state.player.maxHp;
            state.invincibleTimer = RESPAWN_INVINCIBILITY;
            // Respawn at island 1 center
            if (state.islands.length > 0) {
                const spawn = state.islands[0];
                state.player.pos.set(spawn.center.x, spawn.floorY + 2, spawn.center.z);
                state.player.vel.set(0, 0, 0);
            }
        }
    }

    _updateStatBoosts(dt, state, world, audio, factory, t) {
        const playerPos = state.player.pos;

        for (let i = state.statBoosts.length - 1; i >= 0; i--) {
            const boost = state.statBoosts[i];

            // Pop-in scale animation
            if (boost.scale.x < 0.99) {
                boost.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
            }

            // Bob and spin animation
            const crystal = boost.userData.crystal;
            if (crystal) {
                crystal.position.y = 0.3 + Math.sin(t * STAT_BOOST_BOB_SPEED) * STAT_BOOST_BOB_HEIGHT;
                crystal.rotation.y += STAT_BOOST_SPIN_SPEED * dt;
            }

            // Proximity pickup
            const dx = boost.position.x - playerPos.x;
            const dz = boost.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < STAT_BOOST_PICKUP_RANGE) {
                // Apply stat
                const stat = boost.userData.stat;
                const amount = boost.userData.amount;
                if (stat === 'attack') {
                    state.player.attack += amount;
                } else if (stat === 'speed') {
                    state.player.speedBoost += amount;
                } else if (stat === 'health') {
                    state.player.maxHp += amount;
                    state.player.hp = Math.min(state.player.hp + amount, state.player.maxHp);
                }

                // Pickup particles
                for (let j = 0; j < 15; j++) {
                    factory.createParticle(boost.position.clone(), boost.userData.color, 1.2);
                }
                audio.pickup();

                // Remove
                world.remove(boost);
                state.statBoosts.splice(i, 1);
            }
        }
    }

    _updateUI(state) {
        const hpFill = this.ui.hpFill;
        const hpText = this.ui.hpText;
        const hpBar = this.ui.hpBar;
        const deathScreen = this.ui.deathScreen;

        if (hpFill) {
            const pct = (state.player.hp / state.player.maxHp) * 100;
            hpFill.style.width = pct + '%';
            // Color: green > yellow > red
            if (pct > 50) hpFill.style.background = '#44ff44';
            else if (pct > 25) hpFill.style.background = '#ffcc00';
            else hpFill.style.background = '#ff4444';
        }
        if (hpText) {
            hpText.textContent = state.player.hp + ' / ' + state.player.maxHp;
        }

        // Invincibility flash on HP bar
        if (hpBar) {
            if (state.invincibleTimer > 0) {
                hpBar.style.opacity = Math.sin(state.invincibleTimer * 16) > 0 ? '1' : '0.3';
            } else {
                hpBar.style.opacity = '1';
            }
        }

        // Death screen
        if (deathScreen) {
            deathScreen.style.display = state.isDead ? 'flex' : 'none';
        }
    }
}
