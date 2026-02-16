// =====================================================
// ENTITY AI SYSTEM - Creature wander/eat/breed, golem,
//                    eggs, food production, food anim
// =====================================================

import {
    CREATURE_HUNGER_RATE, CREATURE_HUNGER_WARN, CREATURE_HUNGER_DEATH,
    CREATURE_BREED_EAT_THRESHOLD, CREATURE_BREED_AGE, CREATURE_WANDER_RADIUS,
    FOOD_PRODUCTION_TIME, EGG_HATCH_TIME
} from '../constants.js';

export default class EntityAISystem {
    update(dt, context) {
        const { state, world, audio, factory, t } = context;
        const O_Y = factory.O_Y;

        // Entity loop (reverse for safe removal)
        for (let i = state.entities.length - 1; i >= 0; i--) {
            const e = state.entities[i];

            // Pop-in scale
            if (e.scale.x < 0.99) e.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);

            // --- Golem Animation ---
            if (e.userData.type === 'golem') {
                const time = t * 2;
                e.position.y = O_Y + 2.2 + Math.sin(time) * 0.1;
                if (e.userData.lArm) e.userData.lArm.rotation.x = Math.sin(time) * 0.15;
                if (e.userData.rArm) e.userData.rArm.rotation.x = Math.cos(time) * 0.15;
                if (e.userData.legs) {
                    e.userData.legs.forEach((leg, idx) => {
                        leg.scale.y = 1 + Math.sin(time + idx) * 0.05;
                    });
                }
                if (state.player.pos.distanceTo(e.position) < 15) {
                    const targetPos = state.player.pos.clone();
                    targetPos.y = e.position.y;
                    e.lookAt(targetPos);
                }
            }

            // --- Creature / Chief bob ---
            if (e.userData.type === 'creature' || e.userData.type === 'chief') {
                e.position.y = O_Y + 0.3 + Math.sin(t * 4 + (e.userData.hopOffset || 0)) * 0.03;
            }

            // --- Food production (trees & bushes) ---
            if (e.userData.type === 'tree' || e.userData.type === 'bush') {
                e.userData.productionTimer = (e.userData.productionTimer || 0) + dt;
                if (e.userData.productionTimer > FOOD_PRODUCTION_TIME) {
                    e.userData.productionTimer = 0;
                    const foodPos = e.position.clone();
                    foodPos.x += (Math.random() - 0.5) * 1.2;
                    foodPos.z += (Math.random() - 0.5) * 1.2;
                    const food = new THREE.Mesh(
                        new THREE.IcosahedronGeometry(0.15),
                        world.getMat(state.palette.accent)
                    );
                    food.position.set(foodPos.x, O_Y + 0.15, foodPos.z);
                    food.scale.set(0, 0, 0);
                    world.add(food);
                    state.foods.push(food);
                }
            }

            // --- Creature AI ---
            if (e.userData.type === 'creature' && !e.userData.held) {
                this.updateCreature(e, i, dt, context);
            }

            // --- Egg hatching ---
            if (e.userData.type === 'egg') {
                this.updateEgg(e, i, dt, context);
            }
        }

        // --- Food animation ---
        state.foods.forEach(f => {
            if (f.scale.x < 0.99) f.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
            f.position.y = O_Y + 0.15 + Math.sin(t * 3 + f.position.x) * 0.05;
            f.rotation.y += 0.02;
            f.rotation.z = Math.sin(t * 2) * 0.1;
        });
    }

    updateCreature(e, idx, dt, context) {
        const { state, world, audio, factory } = context;

        e.userData.age = (e.userData.age || 0) + dt;
        e.userData.hunger = (e.userData.hunger || 0) + dt * CREATURE_HUNGER_RATE;

        // Find nearest food
        let nearestFood = null, minDist = Infinity;
        state.foods.forEach(f => {
            const d = e.position.distanceTo(f.position);
            if (d < minDist) { minDist = d; nearestFood = f; }
        });

        if (nearestFood && minDist < 0.5) {
            // Eat
            audio.eat();
            world.remove(nearestFood);
            state.foods.splice(state.foods.indexOf(nearestFood), 1);
            e.userData.hunger = 0;
            e.userData.eatenCount = (e.userData.eatenCount || 0) + 1;
            for (let j = 0; j < 3; j++) factory.createParticle(e.position.clone(), state.palette.accent, 0.5);

            // Breed
            if (e.userData.eatenCount >= CREATURE_BREED_EAT_THRESHOLD && e.userData.age > CREATURE_BREED_AGE) {
                e.userData.eatenCount = 0;
                audio.layEgg();
                const egg = factory.createEgg(e.position.clone(), e.userData.color, e.userData.style);
                state.entities.push(egg);
                world.add(egg);
            }
        } else if (nearestFood && minDist < 3) {
            // Move toward food
            const dir = nearestFood.position.clone().sub(e.position).normalize();
            e.position.x += dir.x * e.userData.moveSpeed;
            e.position.z += dir.z * e.userData.moveSpeed;
            e.lookAt(new THREE.Vector3(nearestFood.position.x, e.position.y, nearestFood.position.z));
        } else {
            // Wander
            e.userData.cooldown = (e.userData.cooldown || 0) - dt;
            if (e.userData.cooldown <= 0) {
                e.userData.cooldown = 1 + Math.random() * 2;
                e.userData.wanderDir = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
            }
            if (e.userData.wanderDir) {
                e.position.x += e.userData.wanderDir.x * e.userData.moveSpeed * 0.5;
                e.position.z += e.userData.wanderDir.z * e.userData.moveSpeed * 0.5;
            }
        }

        // Bound to island
        const bc = e.userData.boundCenter || { x: 0, z: 0 };
        const boundR = e.userData.boundRadius || CREATURE_WANDER_RADIUS;
        const relX = e.position.x - bc.x;
        const relZ = e.position.z - bc.z;
        if (relX ** 2 + relZ ** 2 > boundR ** 2) {
            const a = Math.atan2(relZ, relX);
            e.position.x = bc.x + Math.cos(a) * boundR * 0.9;
            e.position.z = bc.z + Math.sin(a) * boundR * 0.9;
        }

        // Hungry warning
        if (e.userData.hunger > CREATURE_HUNGER_WARN) {
            if (!e.userData.bubble) {
                e.userData.bubble = factory.createBubbleTexture('?', '#ff4444');
                e.add(e.userData.bubble);
                audio.hungry();
            }
        } else if (e.userData.bubble) {
            e.remove(e.userData.bubble);
            e.userData.bubble = null;
        }

        // Death by starvation
        if (e.userData.hunger > CREATURE_HUNGER_DEATH) {
            audio.die();
            for (let j = 0; j < 20; j++) factory.createParticle(e.position.clone(), e.userData.color, 1.5);
            world.remove(e);
            state.entities.splice(idx, 1);
            if (state.obstacles.includes(e)) state.obstacles.splice(state.obstacles.indexOf(e), 1);
        }
    }

    updateEgg(e, idx, dt, context) {
        const { state, world, audio, factory, t } = context;

        e.userData.hatchTimer = (e.userData.hatchTimer || EGG_HATCH_TIME) - dt;
        e.rotation.z = Math.sin(t * 5) * 0.1 * (1 - e.userData.hatchTimer / EGG_HATCH_TIME);

        if (e.userData.hatchTimer <= 0) {
            audio.pop();
            for (let j = 0; j < 10; j++) factory.createParticle(e.position.clone(), e.userData.color, 1);
            const baby = factory.createCreature(state.palette, e.position.x, e.position.z, e.userData.parentDNA);
            baby.scale.set(0.5, 0.5, 0.5);
            baby.userData.targetScale = 0.7 + Math.random() * 0.3;
            state.entities.push(baby);
            world.add(baby);
            world.remove(e);
            state.entities.splice(idx, 1);
        }
    }
}
