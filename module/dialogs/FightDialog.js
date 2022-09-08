var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { notifyError } from "../helpers.js";
import { changesState, ExtendedTestDialog } from "./ExtendedTestDialog.js";
import { handleFightRoll } from "../rolls/fightRoll.js";
import * as constants from "../constants.js";
import { getKeypressModifierPreset } from "../rolls/rolls.js";
export class FightDialog extends ExtendedTestDialog {
    constructor(d, o) {
        super(d, o);
        this.participants = this.participants || [];
        this.participantIds = this.participantIds || [];
        this.actionOptions = options;
        this.actors = [];
        this.topic = "Fight";
        this.settingName = "fight-data";
    }
    getData() {
        const data = super.getData();
        if (!this.system.actors.length) {
            this.system.actors = (game.actors?.filter((i) => this.system.participantIds.includes(i.id)) || []);
            this.system.actors.sort((a, b) => {
                return this.system.participantIds.indexOf(a.id) > this.system.participantIds.indexOf(b.id) ? 1 : -1;
            });
        }
        const actors = game.actors?.contents || [];
        data.gmView = game.user?.isGM || false;
        data.participantOptions = actors
            .filter(a => !this.system.participantIds.includes(a.id))
            .map(a => {
            return { id: a.id, name: a.name };
        });
        data.participants.forEach(p => {
            const actor = this.system.actors.find(a => a.id === p.id);
            if (!actor) {
                return;
            }
            p.weapons = actor.system.fightWeapons.map(w => {
                if (w.type === "melee weapon") {
                    const mw = w;
                    return Object.values(mw.system.attacks).map((atk, index) => {
                        return {
                            id: `${mw._id}_${index}`,
                            label: `${mw.name} ${atk.attackName}`
                        };
                    });
                }
                return [{
                        id: w._id,
                        label: w.name
                    }];
            }).flat(1);
            p.showAction2 = !!p.action1;
            p.showAction3 = !!p.action2;
            p.showAction5 = !!p.action4;
            p.showAction6 = !!p.action5;
            p.showAction8 = !!p.action7;
            p.showAction9 = !!p.action8;
            p.showActions = (data.gmView && !p.gmHidden) || (!data.gmView && this.system.actors.find(a => a.id === p.id)?.isOwner);
            p.chosenWeaponLabel = p.weapons.find(x => x.id === p.weaponId)?.label ?? "";
        });
        data.actionOptions = this.system.actionOptions;
        return data;
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('button[data-action="clearAll"]').on('click', e => {
            e.preventDefault();
            this.system.participants = [];
            this.system.participantIds = [];
            this.system.showV1 = this.system.showV2 = this.system.showV3 = false;
            this.system.actors = [];
            this.syncData(this.system);
            this.persistState(this.system);
            this._syncActors();
            this.render();
        });
        html.find('button[data-action="resetRound"]').on('click', e => {
            e.preventDefault();
            this.system.participants.forEach(p => {
                p.action1 = p.action2 = p.action3 = p.action4 = p.action5
                    = p.action6 = p.action7 = p.action8 = p.action9 = "";
            });
            this.system.showV1 = this.system.showV2 = this.system.showV3 = false;
            this.syncData(this.system);
            this.persistState(this.system);
            this.render();
        });
        html.find('input[name="showV1"], input[name="showV2"], input[name="showV3"]').on('change', (e) => this.propagateChange(e));
        html.find('select[name="newParticipant"]').on('change', (e) => this._addNewParticipant(e.target));
        html.find('*[data-action="removeFighter"]').on('click', (e) => {
            e.preventDefault();
            this._removeParticipant(e.target);
        });
        html.find('*[data-action="toggleHidden"').on('click', (e) => {
            e.preventDefault();
            this._toggleHidden(e.target);
        });
        html.find('.fighters-grid input, .fighters-grid select').on('change', (e) => this.updateCollection(e, this.system.participants));
        ["Speed", "Power", "Agility", "Skill", "Steel"].forEach((attr) => {
            html.find(`button[data-action="roll${attr}"]`)
                .on('click', (e) => { this._handleRoll(e, attr.toLowerCase()); });
        });
        html.find('div[data-action="openSheet"], img[data-action="openSheet"]').on('click', (e) => {
            const id = e.currentTarget.attributes.getNamedItem("system-actor-id").nodeValue || "";
            game.actors?.find(a => a.id === id)?.sheet?.render(true);
        });
    }
    _handleRoll(e, type) {
        e.preventDefault();
        const dataPreset = getKeypressModifierPreset(e);
        const index = parseInt(e.target.dataset.index || "0");
        const actor = this.system.actors[index];
        const engagementBonus = parseInt(this.system.participants[index].engagementBonus.toString());
        const positionPenalty = parseInt(this.system.participants[index].positionPenalty.toString());
        if (type === "skill") {
            let itemIdString = this.system.participants[index].weaponId;
            if (!itemIdString) {
                return notifyError("No weapon selected", "A weapon (or bare fists) must be selected to determine which skill to use for the roll.");
            }
            let attackIndex;
            if (itemIdString.indexOf('_') !== -1) {
                attackIndex = parseInt(itemIdString.substr(itemIdString.indexOf('_') + 1));
                itemIdString = itemIdString.substr(0, itemIdString.indexOf('_'));
            }
            return handleFightRoll({ actor, type, itemId: itemIdString, attackIndex, engagementBonus, positionPenalty, dataPreset });
        }
        return handleFightRoll({ actor, type, engagementBonus, positionPenalty, dataPreset });
    }
    _toggleHidden(target) {
        if (!game.user?.isGM) {
            return;
        }
        const index = parseInt(target.dataset.index || "0");
        const hidden = this.system.participants[index].gmHidden;
        this.system.participants[index].gmHidden = !hidden;
    }
    _addNewParticipant(target) {
        const id = target.value;
        const actor = game.actors?.get(id);
        this.system.actors.push(actor);
        this.system.participants.push({ ...toParticipantData(actor),
            action1: '', action2: '', action3: '', action4: '', action5: '',
            action6: '', action7: '', action8: '', action9: '', gmHidden: false,
            engagementBonus: 0, positionPenalty: 0
        });
        this.system.participantIds.push(id);
    }
    _removeParticipant(target) {
        const index = parseInt(target.dataset.index || "0");
        this.system.participantIds.splice(index, 1);
        this.system.participants.splice(index, 1);
        this.system.actors.splice(index, 1);
    }
    activateSocketListeners() {
        super.activateSocketListeners();
        game.socket.on(constants.socketName, ({ type }) => {
            if (type === `syncActors${this.system.topic}`) {
                this.system.actors = (game.actors?.filter((i) => this.system.participantIds.includes(i.id)) || []);
                this.system.actors.sort((a, b) => {
                    return this.system.participantIds.indexOf(a.id) > this.system.participantIds.indexOf(b.id) ? 1 : -1;
                });
                this.render();
            }
        });
        Hooks.on("updateActor", (actor) => {
            if (this.system.actors.includes(actor)) {
                const index = this.system.actors.indexOf(actor);
                this.system.participants[index] = Object.assign(this.system.participants[index], toParticipantData(actor));
                this.render();
            }
        });
    }
    _syncActors() {
        game.socket.emit(constants.socketName, { type: `syncActors${this.system.topic}` });
    }
    get template() {
        return "systems/burningwheel/templates/dialogs/fight.hbs";
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 1000,
            height: 600,
            resizable: true,
            classes: ["fight", "bw-app"]
        }, { overwrite: true });
    }
    static addSidebarControl(html) {
        const buttonElement = document.createElement("button");
        buttonElement.textContent = "Fight";
        buttonElement.className = "fight-sidebar-button";
        buttonElement.onclick = () => game.burningwheel.fight.render(true);
        const combatHeader = $(html).find("header");
        combatHeader.prepend(buttonElement);
    }
}
__decorate([
    changesState()
], FightDialog.prototype, "_toggleHidden", null);
__decorate([
    changesState(FightDialog.prototype._syncActors)
], FightDialog.prototype, "_addNewParticipant", null);
__decorate([
    changesState(FightDialog.prototype._syncActors)
], FightDialog.prototype, "_removeParticipant", null);
function toParticipantData(actor) {
    const reflexesString = `${actor.system.reflexesShade}${(actor.system.type === "character" ?
        actor.system.reflexesExp :
        actor.system.reflexes)}`;
    return {
        name: actor.name,
        id: actor.id,
        imgSrc: actor.img,
        reflexes: reflexesString,
    };
}
const options = {
    "Attack Actions": [
        "Strike", "Great Strike", "Block and Strike", "Lock and Strike"
    ],
    "Defense Actions": [
        "Avoid", "Block", "Counter&shy;strike"
    ],
    "Basic Actions": [
        "Assess", "Change Stance", "Charge/&shy;Tackle", "Draw Weapon", "Physical Action", "Push", "Lock", "Get Up",
    ],
    "Special Actions": [
        "Beat", "Disarm", "Feint", "Throw Person"
    ],
    "Shooting Actions": [
        "Throw Object/&shy;Weapon", "Aim", "Nock and Draw", "Reload", "Fire", "Release Bow", "Snapshot"
    ],
    "Magic Actions": [
        "Cast a Spell", "Drop Spell", "Command Spirit"
    ],
    "Social Actions": [
        "Command", "Intimidate"
    ],
    "Hesitation Actions": [
        "Fall Prone", "Run Screaming", "Stand & Drool", "Swoon"
    ]
};
