var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { changesState, ExtendedTestDialog } from "./ExtendedTestDialog.js";
export class RangeAndCoverDialog extends ExtendedTestDialog {
    constructor(d, o) {
        super(d, o);
        this.topic = "range-and-cover";
        this.settingName = "rnc-data";
        this.memberIds = this.memberIds || [];
        this.teams = this.teams || [];
    }
    get template() {
        return "systems/burningwheel/templates/dialogs/range-and-cover.hbs";
    }
    activateSocketListeners() {
        super.activateSocketListeners();
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('input[name="showV1"], input[name="showV2"], input[name="showV3"]').on('change', (e) => this.propagateChange(e));
        html.find('select[name="newTeam"]').on('change', (e) => this._addNewTeam(e.target));
        html.find('select[name="newMember"]').on('change', (e) => this._addNewMember(e.target));
        html.find('*[data-action="delete-member"]').on('click', (e) => this._deleteMember(e.target));
        html.find('*[data-action="toggle-hidden"]').on('click', (e) => this._toggleHidden(e.target));
        html.find('.team-grid select, .team-card input').on('change', (e) => this.updateCollection(e, this.system.teams));
        html.find('*[data-action="resetRound"]').on('click', (e) => this._resetRound(e));
        html.find('*[data-action="clearAll"]').on('click', (e) => this._clearAll(e));
    }
    _clearAll(e) {
        e.preventDefault();
        this.system.actors = [];
        this.system.teams = [];
        this.system.showV1 = this.system.showV2 = this.system.showV3 = false;
        this.system.memberIds = [];
    }
    _resetRound(e) {
        e.preventDefault();
        this.system.teams.forEach(t => {
            t.action1 = t.action2 = t.action3 = "Do Nothing";
        });
        this.system.showV1 = this.system.showV2 = this.system.showV3 = false;
    }
    _toggleHidden(target) {
        const index = parseInt(target.dataset.index || "0");
        const team = this.system.teams[index];
        team.hideActions = !team.hideActions;
    }
    _addNewTeam(target) {
        const id = target.value;
        const actor = this.system.actors.find(a => a.id === id);
        this.system.teams.push({
            members: [{ id, name: actor.name }],
            range: "Optimal",
            hideActions: false,
            action1: "Do Nothing",
            action2: "Do Nothing",
            action3: "Do Nothing",
            strideDice: 0,
            positionDice: 0,
            weaponDice: 0,
            miscDice: 0
        });
        if (actor.system.type === "character") {
            // ensure only one character can be added at once.
            // reusing npcs is probably fine.
            this.system.memberIds.push(id);
        }
    }
    _addNewMember(target) {
        const id = target.value;
        const index = parseInt(target.dataset.index || "0");
        const team = this.system.teams[index];
        const actor = this.system.actors.find(a => a.id === id);
        team.members.push({ id: actor.id, name: actor.name });
        if (actor.system.type === "character") {
            this.system.memberIds.push(id);
        }
    }
    _deleteMember(target) {
        const teamIndex = parseInt(target.dataset.index || "0");
        const memberIndex = parseInt(target.dataset.memberIndex || "0");
        const team = this.system.teams[teamIndex];
        const deleted = team.members.splice(memberIndex, 1);
        if (team.members.length === 0) {
            this.system.teams.splice(teamIndex, 1);
        }
        if (this.system.actors.find(a => a.id === deleted[0].id)?.system.type === "character") {
            this.system.memberIds.splice(this.system.memberIds.indexOf(deleted[0].id), 1);
        }
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 1000,
            height: 600,
            resizable: true,
            classes: ["rnc", "bw-app"]
        }, { overwrite: true });
    }
    static addSidebarControl(html) {
        const buttonElement = document.createElement("button");
        buttonElement.textContent = "Range and Cover";
        buttonElement.className = "rnc-sidebar-button";
        buttonElement.onclick = () => game.burningwheel.rangeAndCover.render(true);
        const combatHeader = $(html).find("header");
        combatHeader.prepend(buttonElement);
    }
    getData() {
        const data = super.getData();
        data.actionOptions = options;
        if (!this.system.actors) {
            this.system.actors = game.actors?.contents;
        }
        data.actors = this.system.actors.filter(a => !this.system.memberIds.includes(a.id));
        data.gmView = game.user?.isGM || false;
        data.teams.forEach(t => {
            const actorData = t.members.map(m => m.id).map(id => this.system.actors.find(a => a.id === id));
            t.editable = (data.gmView && !t.hideActions) || (!data.gmView && actorData.some(a => a.isOwner));
            t.showAction1 = data.showV1 || t.editable;
            t.showAction2 = data.showV2 || t.editable;
            t.showAction3 = data.showV3 || t.editable;
        });
        return data;
    }
}
__decorate([
    changesState()
], RangeAndCoverDialog.prototype, "_clearAll", null);
__decorate([
    changesState()
], RangeAndCoverDialog.prototype, "_resetRound", null);
__decorate([
    changesState()
], RangeAndCoverDialog.prototype, "_toggleHidden", null);
__decorate([
    changesState()
], RangeAndCoverDialog.prototype, "_addNewTeam", null);
__decorate([
    changesState()
], RangeAndCoverDialog.prototype, "_addNewMember", null);
__decorate([
    changesState()
], RangeAndCoverDialog.prototype, "_deleteMember", null);
const options = {
    "Move In": [
        "Close", "Sneak In", "Flank", "Charge"
    ],
    "Hold Ground": [
        "Maintain Distance", "Hold Position"
    ],
    "Move Out": [
        "Withdraw", "Sneak Out", "Fall Back", "Retreat"
    ],
    "Hesitation Actions": [
        "Fall Prone", "Run Screaming", "Stand & Drool", "Swoon"
    ]
};
