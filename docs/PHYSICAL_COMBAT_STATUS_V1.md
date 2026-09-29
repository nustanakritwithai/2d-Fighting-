# Physical Combat Status V1

## Intent

This prototype is a 1v1 human-vs-monster combat simulation. It intentionally rejects RPG combat authorities such as HP, ATK, DEF, critical chance and dodge chance.

The combat question is not “how much health remains?” but “can this body still stand, move, defend and attack?”

## Canonical state

Each combatant owns:

- consciousness
- breathing load
- fatigue
- global pain
- balance
- posture
- momentum
- body-part function / pain / load / mobility / control
- projected movement capability
- projected combat capability

Human V1 body schema:

- HEAD
- TORSO
- LEFT_ARM / RIGHT_ARM
- LEFT_LEG / RIGHT_LEG

Quadruped monster V1 body schema:

- HEAD
- TORSO
- FRONT_LEFT_LEG / FRONT_RIGHT_LEG
- REAR_LEFT_LEG / REAR_RIGHT_LEG
- TAIL

## Authority pipeline

```text
Input / AI intent
→ motion
→ spatial contact
→ relative velocity + effective mass
→ Impact Resolver
→ local body response
→ balance / consciousness / breathing / limb function
→ reaction
→ animation / UI evidence
→ capability projection
→ match resolution
```

Animation and UI never write combat truth.

## Impact

An attack supplies effective mass, relative speed, contact quality, direction and a real target body part. The resolver produces transmitted impulse and severity. A guard absorbs and redirects some impulse but never deletes it.

There are no random dodge, stun or knockdown rolls. Dodge succeeds by leaving contact range. Knockdown follows from impact severity and loss of balance.

## Reactions

- NONE
- FLINCH
- STAGGER
- HEAVY_STAGGER
- KNOCKDOWN
- UNCONSCIOUS

## Functional consequences

Leg impairment reduces actual movement projection. Arm impairment reduces the attack-part contribution to combat capability. Head impact can reduce consciousness. Torso impact can spike breathing load. Fatigue slows movement and recovery.

## Match end

The match ends when a combatant is incapacitated or when the monster retreats due to high pain plus meaningful mobility loss. No `hp <= 0` rule exists.

## V1 acceptance

1. No HP/ATK/DEF/level field is a combat authority.
2. Human and monster use the same impact resolver.
3. Equal impact destabilizes bodies differently according to mass and stability.
4. Guard reduces but does not erase transmitted impulse.
5. Dodge is spatial, not probabilistic.
6. Repeated leg impact changes movement capability.
7. Head impact changes consciousness.
8. Balance can produce knockdown.
9. Fatigue and breathing recover over time at different rates.
10. Combat ends by incapacitation or retreat.
11. The simulation is deterministic for identical starting state and input.
12. UNKNOWN is not PASS.
