import * as constants from "../constants.js";
import { Trait } from "../items/trait.js";
export class BWActor extends Actor {
    constructor() {
        super(...arguments);
        this.batchAdd = {
            task: -1,
            items: []
        };
    }
    async _handleBatchAdd() {
        const items = this.batchAdd.items;
        this.batchAdd.items = [];
        clearTimeout(this.batchAdd.task);
        this.batchAdd.task = -1;
        return this.createEmbeddedDocuments("Item", items);
    }
    batchAddItem(item) {
        if (this.batchAdd.task === -1) {
            this.batchAdd.task = setTimeout(() => this._handleBatchAdd(), 500);
        }
        this.batchAdd.items.push(item);
    }
    async processNewItem(item, userId) {
        if (game.userId !== userId) {
            // this item has been added by someone else.
            return;
        }
        if (item.type === "trait") {
            const trait = item;
            if (trait.system.addsReputation) {
                const repsystem = {
                    name: trait.system.reputationName,
                    type: "reputation",
                    img: constants.defaultImages.reputation
                };
                repsystem["system.dice"] = trait.system.reputationDice;
                repsystem["system.infamous"] = trait.system.reputationInfamous;
                repsystem["system.description"] = trait.system.text;
                this.batchAddItem(repsystem);
            }
            if (trait.system.addsAffiliation) {
                const repsystem = {
                    name: trait.system.affiliationName,
                    type: "affiliation",
                    img: constants.defaultImages.affiliation
                };
                repsystem["system.dice"] = trait.system.affiliationDice;
                repsystem["system.description"] = trait.system.text;
                this.batchAddItem(repsystem);
            }
        }
    }
    preparesystem() {
        super.preparesystem();
    }
    prepareBaseData() {
        this._prepareActorsystem();
    }
    getForkOptions(skillName) {
        return this.system.forks.filter(s => s.name !== skillName // skills reduced to 0 due to wounds can't be used as forks.
            && s.system.exp > (this.system.ptgs.woundDice || 0))
            .map(s => {
            const exp = s.system.exp;
            // skills at 7+ exp provide 2 dice in forks.
            return { name: s.name, amount: exp >= 7 ? 2 : 1 };
        });
    }
    getWildForks(skillName) {
        return this.system.wildForks.filter(s => s.name !== skillName // skills reduced to 0 due to wounds can't be used as forks.
            && s.system.exp > (this.system.ptgs.woundDice || 0))
            .map(s => {
            const exp = s.system.exp;
            // skills at 7+ exp provide 2 dice in forks.
            return { name: s.name, amount: exp >= 7 ? 2 : 1 };
        });
    }
    _addRollModifier(rollName, modifier, onlyNonZero = false) {
        rollName = rollName.toLowerCase();
        if (onlyNonZero && !modifier.dice && !modifier.obstacle) {
            return;
        }
        if (this.system.rollModifiers[rollName]) {
            this.system.rollModifiers[rollName].push(modifier);
        }
        else {
            this.system.rollModifiers[rollName] = [modifier];
        }
    }
    getRollModifiers(rollName) {
        return (this.system.rollModifiers[rollName.toLowerCase()] || []).concat(this.system.rollModifiers.all || []);
    }
    _addAptitudeModifier(name, modifier) {
        name = name.toLowerCase();
        if (Number.isInteger(this.system.aptitudeModifiers[name])) {
            this.system.aptitudeModifiers[name] += modifier;
        }
        else {
            this.system.aptitudeModifiers[name] = modifier;
        }
    }
    getAptitudeModifiers(name = "") {
        return this.system.aptitudeModifiers[name.toLowerCase()] || 0;
    }
    _prepareActorsystem() {
        this.system.rollModifiers = {};
        this.system.callOns = {};
        this.system.aptitudeModifiers = {};
        this._calculateClumsyWeight();
        this.system.forks = [];
        this.system.wildForks = [];
        this.system.circlesBonus = [];
        this.system.circlesMalus = [];
        this.system.martialSkills = [];
        this.system.socialSkills = [];
        this.system.sorcerousSkills = [];
        this.system.toolkits = [];
        this.system.fightWeapons = [];
        if (this.system.items) {
            this.system.items.forEach(({ system }) => {
                const i = system;
                switch (i.type) {
                    case "skill":
                        if (!i.system.learning &&
                            !i.system.training) {
                            if (i.system.wildFork) {
                                this.system.wildForks.push(i);
                            }
                            else {
                                this.system.forks.push(i);
                            }
                        }
                        if (i.system.skilltype === "martial" &&
                            !i.system.training) {
                            this.system.martialSkills.push(i);
                        }
                        else if (i.system.skilltype === "sorcerous") {
                            this.system.sorcerousSkills.push(i);
                        }
                        else if (i.system.skilltype === "social") {
                            this.system.socialSkills.push(i);
                        }
                        break;
                    case "reputation":
                        const rep = i;
                        if (rep.system.infamous) {
                            this.system.circlesMalus.push({ name: rep.name, amount: rep.system.dice });
                        }
                        else {
                            this.system.circlesBonus.push({ name: rep.name, amount: rep.system.dice });
                        }
                        break;
                    case "affiliation":
                        this.system.circlesBonus.push({ name: i.name, amount: i.system.dice });
                        break;
                    case "trait":
                        const t = i;
                        if (t.system.traittype === "die") {
                            if (t.system.hasDieModifier && t.system.dieModifierTarget) {
                                t.system.dieModifierTarget.split(',').forEach(target => this._addRollModifier(target.trim(), Trait.asRollDieModifier(t)));
                            }
                            if (t.system.hasObModifier && t.system.obModifierTarget) {
                                t.system.obModifierTarget.split(',').forEach(target => this._addRollModifier(target.trim(), Trait.asRollObModifier(t)));
                            }
                        }
                        if (t.system.traittype === "call-on") {
                            if (t.system.callonTarget) {
                                this._addCallon(t.system.callonTarget, t.name);
                            }
                        }
                        if (t.system.hasAptitudeModifier) {
                            t.system.aptitudeTarget.split(',').forEach((target) => this._addAptitudeModifier(target.trim(), t.system.aptitudeModifier));
                        }
                        break;
                    case "possession":
                        if (i.system.isToolkit) {
                            this.system.toolkits.push(i);
                        }
                        break;
                    case "spell":
                    case "melee weapon":
                    case "ranged weapon":
                        this.system.fightWeapons.push(i);
                        break;
                }
            });
        }
    }
    _addCallon(callonTarget, name) {
        callonTarget.split(',').forEach(s => {
            if (this.system.callOns[s.trim().toLowerCase()]) {
                this.system.callOns[s.trim().toLowerCase()].push(name);
            }
            else {
                this.system.callOns[s.trim().toLowerCase()] = [name];
            }
        });
    }
    getCallons(roll) {
        return this.system.callOns[roll.toLowerCase()] || [];
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    _onCreate(system, options, userId) {
        super._onCreate(system, options, userId);
        if (this.system.items.contents.length) {
            return; // this is most likely a duplicate of an existing actor. we don't need to add default items.
        }
        if (game.userId !== userId) {
            // we aren't the person who created this actor
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.createEmbeddedDocuments("Item", [
            { name: "Instinct 1", type: "instinct", system: {}, img: constants.defaultImages.instinct },
            { name: "Instinct 2", type: "instinct", system: {}, img: constants.defaultImages.instinct },
            { name: "Instinct 3", type: "instinct", system: {}, img: constants.defaultImages.instinct },
            { name: "Instinct Special", type: "instinct", system: {}, img: constants.defaultImages.instinct },
            { name: "Belief 1", type: "belief", system: {}, img: constants.defaultImages.belief },
            { name: "Belief 2", type: "belief", system: {}, img: constants.defaultImages.belief },
            { name: "Belief 3", type: "belief", system: {}, img: constants.defaultImages.belief },
            { name: "Belief Special", type: "belief", system: {}, img: constants.defaultImages.belief },
            { ...constants.bareFistsystem, img: "icons/skills/melee/unarmed-punch-fist-yellow-red.webp" }
        ]);
    }
    async _preCreate(actor, _options, user) {
        await super._preCreate(actor, _options, user);
        if (actor.type === 'character' || actor.type === 'npc') {
            this.system.token.update({
                disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
                vision: true
            });
        }
        if (actor.type === 'character' || actor.type === 'setting') {
            this.system.token.update({
                actorLink: true,
                disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
            });
        }
    }
    _calculateClumsyWeight() {
        const clumsyWeight = {
            agilityPenalty: 0,
            speedObPenalty: 0,
            speedDiePenalty: 0,
            climbingPenalty: 0,
            healthFortePenalty: 0,
            throwingShootingPenalty: 0,
            stealthyPenalty: 0,
            swimmingPenalty: 0,
            helmetObPenalty: 0,
            untrainedHealth: 0,
            untrainedAll: 0
        };
        const charsystem = this.system.type === "character" ? this.system : undefined;
        this.items.filter(i => (i.type === "armor" && i.system.equipped))
            .forEach(i => {
            const a = i.system;
            if (a.hasHelm) {
                clumsyWeight.helmetObPenalty = a.perceptionObservationPenalty || 0;
            }
            if (a.hasTorso) {
                clumsyWeight.healthFortePenalty = Math.max(clumsyWeight.healthFortePenalty, a.healthFortePenalty || 0);
                clumsyWeight.stealthyPenalty = Math.max(clumsyWeight.stealthyPenalty, a.stealthyPenalty || 0);
            }
            if (a.hasLeftArm || a.hasRightArm) {
                clumsyWeight.agilityPenalty = Math.max(clumsyWeight.agilityPenalty, a.agilityPenalty || 0);
                clumsyWeight.throwingShootingPenalty = Math.max(clumsyWeight.throwingShootingPenalty, a.throwingShootingPenalty || 0);
            }
            if (a.hasLeftLeg || a.hasRightLeg) {
                clumsyWeight.speedDiePenalty = Math.max(clumsyWeight.speedDiePenalty, a.speedDiePenalty || 0);
                clumsyWeight.speedObPenalty = Math.max(clumsyWeight.speedObPenalty, a.speedObPenalty || 0);
                clumsyWeight.climbingPenalty = Math.max(clumsyWeight.climbingPenalty, a.climbingPenalty || 0);
            }
            if (charsystem && !charsystem.settings.armorTrained &&
                (a.hasHelm || a.hasLeftArm || a.hasRightArm || a.hasTorso || a.hasLeftLeg || a.hasRightLeg)) {
                // if this is more than just a shield
                if (a.untrainedPenalty === "plate") {
                    clumsyWeight.untrainedAll = Math.max(clumsyWeight.untrainedAll, 2);
                    clumsyWeight.untrainedHealth = 0;
                }
                else if (a.untrainedPenalty === "heavy") {
                    clumsyWeight.untrainedAll = Math.max(clumsyWeight.untrainedAll, 1);
                    clumsyWeight.untrainedHealth = 0;
                }
                else if (a.untrainedPenalty === "light" && clumsyWeight.untrainedAll === 0) {
                    clumsyWeight.untrainedHealth = 1;
                }
            }
        });
        if (charsystem) {
            charsystem.clumsyWeight = clumsyWeight;
        }
        const baseModifier = { optional: true, label: "Armor Clumsy Weight" };
        this._addRollModifier("climbing", { obstacle: clumsyWeight.climbingPenalty, ...baseModifier }, true);
        this._addRollModifier("perception", { obstacle: clumsyWeight.helmetObPenalty, ...baseModifier }, true);
        this._addRollModifier("observation", { obstacle: clumsyWeight.helmetObPenalty, ...baseModifier }, true);
        this._addRollModifier("shooting", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("bow", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("throwing", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("crossbow", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("firearms", { obstacle: clumsyWeight.throwingShootingPenalty, ...baseModifier }, true);
        this._addRollModifier("agility", { obstacle: clumsyWeight.agilityPenalty, ...baseModifier }, true);
        this._addRollModifier("speed", { dice: -clumsyWeight.speedDiePenalty, ...baseModifier }, true);
        this._addRollModifier("speed", { obstacle: clumsyWeight.speedObPenalty, ...baseModifier }, true);
        this._addRollModifier("health", { obstacle: clumsyWeight.healthFortePenalty, ...baseModifier }, true);
        this._addRollModifier("forte", { obstacle: clumsyWeight.healthFortePenalty, ...baseModifier }, true);
        this._addRollModifier("stealthy", { obstacle: clumsyWeight.stealthyPenalty, ...baseModifier }, true);
        this._addRollModifier("swimming", { obstacle: clumsyWeight.swimmingPenalty, ...baseModifier }, true);
        this._addRollModifier("all", { obstacle: clumsyWeight.untrainedAll, label: "Untrained Armor Penalty", optional: true }, true);
        this._addRollModifier("health", { obstacle: clumsyWeight.untrainedHealth, label: "Untrained Armor", optional: true }, true);
        this._addRollModifier("forte", { obstacle: clumsyWeight.untrainedHealth, label: "Untrained Armor", optional: true }, true);
    }
    updateArthaForSkill(_skillId, persona, deeds) {
        const updatesystem = {};
        updatesystem["system.deeds"] = this.system.deeds - (deeds ? 1 : 0);
        updatesystem["system.persona"] = this.system.persona - persona;
        this.update(updatesystem);
    }
    updateArthaForStat(accessor, persona, deeds) {
        const updatesystem = {};
        updatesystem["system.deeds"] = this.system.deeds - (deeds ? 1 : 0);
        updatesystem["system.persona"] = this.system.persona - persona;
        this.update(updatesystem);
    }
}
