import { handleNpcStatRoll } from "../rolls/npcStatRoll.js";
import { getMacroRollPreset } from "./Macro.js";
import { handleCirclesRoll } from "../rolls/rollCircles.js";
import { handleResourcesRoll } from "../rolls/rollResources.js";
import { handleStatRoll } from "../rolls/rollStat.js";
import { handleAttrRoll } from "../rolls/rollAttribute.js";
export function CreateStatMacro(data) {
    if (!data.actorId) {
        return null;
    }
    return {
        name: `Test ${data.system.name}`,
        type: 'script',
        command: `game.burningwheel.macros.rollStat("${data.actorId}", "${data.system.path}", "${data.system.name}");`,
        img: defaultIcons[data.system.path] || "icons/commodities/biological/organ-heart-red.webp"
    };
}
export function RollStatMacro(actorId, statPath, statName) {
    const actor = game.actors?.find(a => a.id === actorId);
    if (!actor) {
        ui.notifications?.notify("Unable to find actor linked to this macro. Were they deleted?", "error");
        return;
    }
    const stat = getProperty(actor.system, statPath);
    if (!stat) {
        ui.notifications?.notify(`Stat appears to be missing from the actor somehow. Was looking for ${statPath}.`, "error");
        return;
    }
    const dataPreset = getMacroRollPreset(actor);
    if (actor.system.type === "character") {
        const char = actor;
        if (statPath === "system.circles") {
            handleCirclesRoll({ actor: char, stat, dataPreset });
        }
        else if (statPath === "system.resources") {
            handleResourcesRoll({ actor: char, stat, dataPreset });
        }
        else if (["power", "agility", "forte", "will", "perception", "speed"].some(s => statPath.indexOf(s) !== -1)) {
            handleStatRoll({ actor: char, stat, statName, accessor: statPath, dataPreset });
        }
        else {
            handleAttrRoll({ actor: char, stat, accessor: statPath, attrName: statName, dataPreset });
        }
    }
    else {
        handleNpcStatRoll({ actor: actor, dice: stat.exp, shade: stat.shade, open: stat.open, statName: statName, dataPreset });
    }
}
const defaultIcons = {
    "system.power": "icons/commodities/claws/claw-bear-brown.webp",
    "system.forte": "icons/commodities/biological/organ-stomach.webp",
    "system.perception": "icons/commodities/biological/eye-blue.webp",
    "system.will": "icons/commodities/gems/gem-faceted-radiant-red.webp",
    "system.speed": "icons/commodities/biological/wing-bird-white.webp",
    "system.agility": "icons/environment/settlement/target.webp",
    "system.health": "icons/commodities/biological/organ-heart-red.webp",
    "system.steel": "icons/equipment/shield/heater-steel-worn.webp",
    "system.circles": "icons/environment/people/group.webp",
    "system.resources": "icons/commodities/currency/coins-plain-stack-gold-yellow.webp",
    "system.custom1": "icons/environment/people/cleric-orange.webp",
    "system.custom2": "icons/environment/people/cleric-orange.webp",
};
