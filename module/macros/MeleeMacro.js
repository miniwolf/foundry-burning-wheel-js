import { getImage, getMacroRollPreset } from "./Macro.js";
import { handleNpcWeaponRoll } from "../rolls/npcSkillRoll.js";
import { handleWeaponRoll } from "../rolls/rollWeapon.js";
export function CreateMeleeRollMacro(data) {
    if (!data.actorId) {
        return null;
    }
    return {
        name: `Attack with ${data.system.name}`,
        type: 'script',
        command: `game.burningwheel.macros.rollMelee("${data.actorId}", "${data.id}", ${data.system.index});`,
        img: getImage(data.system.img, "melee weapon")
    };
}
export function RollMeleeMacro(actorId, weaponId, attackIndex) {
    const actor = game.actors?.find(a => a.id === actorId);
    if (!actor) {
        ui.notifications?.notify("Unable to find actor linked to this macro. Were they deleted?", "error");
        return;
    }
    const weapon = actor.items.get(weaponId);
    if (!weapon) {
        ui.notifications?.notify("Unable to find weapon linked to this macro. Was it deleted?", "error");
        return;
    }
    const skill = actor.items.get(weapon.system.skillId);
    if (!skill) {
        ui.notifications?.notify("Unable to find skill linked to the weapon in this macro. Ensure a martial skill is linked with this weapon.", "error");
        return;
    }
    const dataPreset = getMacroRollPreset(actor);
    if (actor.system.type === "character") {
        handleWeaponRoll({ actor: actor, weapon, attackIndex, skill, dataPreset });
    }
    else {
        handleNpcWeaponRoll({ actor: actor, weapon, skill, attackIndex, dataPreset });
    }
}
