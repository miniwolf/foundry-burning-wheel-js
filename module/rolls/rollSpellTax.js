import * as helpers from "../helpers.js";
import { buildRerollData, getRollNameClass, rollDice, templates, extractRollData, mergeDialogData } from "./rolls.js";
import { translateWoundValue } from "../helpers.js";
export async function handleSpellTaxRoll(target, sheet, dataPreset) {
    const obstacle = parseInt(target.dataset.obstacle || "0");
    const spellName = target.dataset.rollableName || "Unknown Spell";
    if (!obstacle && !spellName) {
        return helpers.notifyError("Missing Spell Data", "Tried to roll a tax test with no obstacle or spell name set.");
    }
    else
        return showSpellTaxDialog(obstacle, spellName, sheet.actor, dataPreset);
}
export async function showSpellTaxDialog(obstacle, spellName, actor, dataPreset) {
    const stat = getProperty(actor.system, "system.forte");
    const rollModifiers = actor.getRollModifiers("forte");
    const tax = actor.system.forteTax;
    const data = mergeDialogData({
        name: `${spellName} Tax Test`,
        difficulty: obstacle,
        bonusDice: 0,
        arthaDice: 0,
        woundDice: actor.system.ptgs.woundDice,
        obPenalty: actor.system.ptgs.obPenalty,
        stat,
        tax,
        optionalDiceModifiers: rollModifiers.filter(r => r.optional && r.dice),
        optionalObModifiers: rollModifiers.filter(r => r.optional && r.obstacle),
        showDifficulty: true,
        showObstacles: true,
        useCustomDifficulty: true,
    }, dataPreset);
    const html = await renderTemplate(templates.pcRollDialog, data);
    return new Promise(_resolve => new Dialog({
        title: `${spellName} Tax Test`,
        content: html,
        buttons: {
            roll: {
                label: "Roll",
                callback: async (dialogHtml) => taxTestCallback(dialogHtml, stat, actor, tax, spellName)
            }
        },
        default: "roll"
    }).render(true));
}
async function taxTestCallback(dialogHtml, stat, actor, tax, spellName) {
    const { diceTotal, difficultyTotal, difficultyGroup, baseDifficulty, obSources, dieSources, persona, deeds } = extractRollData(dialogHtml);
    const roll = await rollDice(diceTotal, stat.open, stat.shade);
    if (!roll) {
        return;
    }
    const isSuccessful = parseInt(roll.result) >= difficultyTotal;
    const fateReroll = buildRerollData({ actor, roll, accessor: "system.forte" });
    const callons = actor.getCallons("forte").map(s => {
        return { label: s, ...buildRerollData({ actor, roll, accessor: "system.forte" }) };
    });
    actor.updateArthaForStat("system.forte", persona, deeds);
    const data = {
        name: `${spellName} Tax`,
        successes: roll.result,
        difficulty: baseDifficulty,
        obstacleTotal: difficultyTotal,
        nameClass: getRollNameClass(stat.open, stat.shade),
        success: isSuccessful,
        rolls: roll.dice[0].results,
        difficultyGroup: difficultyGroup,
        penaltySources: obSources,
        dieSources,
        fateReroll,
        callons
    };
    data.extraInfo = `Attempting to sustain ${spellName}.`;
    if (actor.system.type === "character") {
        actor.addStatTest(stat, "Forte", "system.forte", difficultyGroup, isSuccessful);
    }
    if (!isSuccessful) {
        const margin = difficultyTotal - parseInt(roll.result);
        const forteExp = stat.exp;
        if (forteExp < margin + tax) {
            // overtax.
            const baseWound = (margin + tax - forteExp) * difficultyTotal;
            data.extraInfo += ` Tax test failed by ${margin}. The caster maxes out their Forte tax and risks a ${translateWoundValue("B", baseWound)} wound.`;
            new Dialog({
                title: "Overtaxed!",
                content: `<p>Failing your tax test by ${margin} when you have ${forteExp - tax} untaxed Forte dice has resulted in overtax.</p>
                <p>Your forte will be maxed out automatically as your character falls unconscious. Also apply a ${translateWoundValue("B", baseWound)} wound to your character.</p>`,
                buttons: {
                    yes: {
                        label: "Ouch! Okay.",
                        callback: () => {
                            actor.update({ data: { forteTax: forteExp } });
                        }
                    },
                    no: {
                        label: "I'd rather not.",
                        callback: () => { return; }
                    }
                },
                default: "yes"
            }).render(true);
        }
        else {
            data.extraInfo += ` Tax test failed by ${margin}. The caster's forte is Taxed.`;
            new Dialog({
                title: "Taxed",
                content: `<p>You failed your tax test! Your forte tax will increase by ${margin}.</p>
                <p>Also, any currently sustained spells are lost.</p>`,
                buttons: {
                    yes: {
                        label: "Ok",
                        callback: () => {
                            actor.update({ data: { forteTax: tax + margin } });
                        }
                    },
                    no: {
                        label: "Skip for Now",
                        callback: () => { return; }
                    }
                },
                default: "yes"
            }).render(true);
        }
    }
    const messageHtml = await renderTemplate(templates.pcRollMessage, data);
    return ChatMessage.create({
        content: messageHtml,
        speaker: ChatMessage.getSpeaker({ actor: actor })
    });
}
