import { weaponLengthSelect } from "../constants.js";
import { DivOfText } from "../helpers.js";
import { BWItem } from "./item.js";
export class Spell extends BWItem {
    prepareData() {
        super.prepareData();
        const actor = this.actor;
        this.system.obstacleLabel =
            `${this.system.variableObstacle ?
                this.system.variableObstacleDescription :
                this.system.obstacle}${this.system.upSpell ?
                '^' : ''}`;
        if (this.system.isWeapon && this.system.hasOwner && actor) {
            const willScore = actor.system.will.exp;
            if (this.system.halfWill) {
                this.system.mark = Math.floor(willScore / 2.0) + this.system.willDamageBonus;
            }
            else {
                this.system.mark = willScore + this.system.willDamageBonus;
            }
            this.data.incidental = Math.ceil(this.system.mark / 2.0);
            this.system.superb = Math.floor(this.system.mark * 1.5);
        }
        this.system.spellLengths = weaponLengthSelect;
        if (this.system.hasOwner && actor) {
            this.system.aptitude = 10 - actor.system.perception.exp || 1
                + actor.getAptitudeModifiers("perception")
                + actor.getAptitudeModifiers("spells");
        }
    }
    async getSpellMessageData() {
        const element = document.createElement("div");
        element.className = "spell-extra-info";
        element.appendChild(DivOfText(this.name, "spell-title"));
        if (this.system.isWeapon) {
            const roll = (await new Roll("1d6").roll({ async: true })).dice[0].results[0].result;
            element.appendChild(DivOfText("I", "ims-header"));
            element.appendChild(DivOfText("M", "ims-header"));
            element.appendChild(DivOfText("S", "ims-header"));
            element.appendChild(DivOfText("Va", "ims-header"));
            element.appendChild(DivOfText("Act.", "ims-header"));
            element.appendChild(DivOfText("DoF", "ims-header"));
            element.appendChild(DivOfText("Length", "ims-header"));
            element.appendChild(DivOfText("B " + this.data.incidental, roll < 3 ? "highlight" : undefined));
            element.appendChild(DivOfText("B " + this.system.mark, [3, 4].includes(roll) ? "highlight" : undefined));
            element.appendChild(DivOfText("B " + this.system.superb, roll > 4 ? "highlight" : undefined));
            element.appendChild(DivOfText("" + this.system.va));
            element.appendChild(DivOfText("" + this.system.actions));
            element.appendChild(DivOfText(`${roll}`, "roll-die"));
            element.appendChild(DivOfText(this.system.weaponLength));
        }
        return element.outerHTML;
    }
}
