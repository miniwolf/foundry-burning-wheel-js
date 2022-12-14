import { buildRerollData, getRollNameClass, rollDice, templates, extractRollData, mergeDialogData } from "./rolls.js";
import { buildHelpDialog } from "../dialogs/buildHelpDialog.js";
export async function handleResourcesRollEvent({ sheet, dataPreset }) {
    const stat = sheet.actor.system.resources;
    const actor = sheet.actor;
    return handleResourcesRoll({ actor, stat, dataPreset });
}
export async function handleResourcesRoll({ actor, stat, dataPreset }) {
    if (dataPreset && dataPreset.addHelp) {
        // add a test log instead of testing
        return buildHelpDialog({
            exponent: stat.exp,
            path: "system.resources",
            actor,
            helpedWith: "Resources"
        });
    }
    const rollModifiers = actor.getRollModifiers("resources");
    const data = mergeDialogData({
        name: "Resources Test",
        difficulty: 3,
        bonusDice: 0,
        arthaDice: 0,
        tax: parseInt(actor.system.resourcesTax.toString()),
        stat,
        cashDieOptions: Array.from(Array(actor.system.cash || 0).keys()),
        fundDieOptions: Array.from(Array(actor.system.funds || 0).keys()),
        optionalDiceModifiers: rollModifiers.filter(r => r.optional && r.dice),
        optionalObModifiers: rollModifiers.filter(r => r.optional && r.obstacle),
        showDifficulty: !game.burningwheel.useGmDifficulty,
        showObstacles: !game.burningwheel.useGmDifficulty
    }, dataPreset);
    const html = await renderTemplate(templates.pcRollDialog, data);
    return new Promise(_resolve => new Dialog({
        title: `Resources Test`,
        content: html,
        buttons: {
            roll: {
                label: "Roll",
                callback: async (dialogHtml) => resourcesRollCallback(dialogHtml, stat, actor)
            }
        },
        default: "roll"
    }).render(true));
}
async function resourcesRollCallback(dialogHtml, stat, actor) {
    const rollData = extractRollData(dialogHtml);
    if (rollData.cashDice) {
        const currentCash = actor.system.cash || 0;
        actor.update({ "system.cash": currentCash - rollData.cashDice });
    }
    const roll = await rollDice(rollData.diceTotal, stat.open, stat.shade);
    if (!roll) {
        return;
    }
    const fateReroll = buildRerollData({ actor, roll, accessor: "system.resources" });
    const isSuccess = parseInt(roll.result) >= rollData.difficultyTotal;
    const callons = actor.getCallons("resources").map(s => {
        return { label: s, ...buildRerollData({ actor, roll, accessor: "system.resources" }) };
    });
    actor.updateArthaForStat("system.resources", rollData.persona, rollData.deeds);
    if (!isSuccess) {
        const taxAmount = rollData.difficultyGroup === "Challenging" ? (rollData.difficultyTotal - parseInt(roll.result)) :
            (rollData.difficultyGroup === "Difficult" ? 2 : 1);
        const taxMessage = new Dialog({
            title: "Failed Resource Roll!",
            content: `<p>You have failed a ${rollData.difficultyGroup} Resource test.</p><p>How do you wish to be taxed?</p><hr/>`,
            buttons: {
                full: {
                    label: `Full Tax (${taxAmount} tax)`,
                    callback: () => actor.taxResources(taxAmount, rollData.fundDice)
                },
                cut: {
                    label: "Cut your losses. (1 tax)",
                    callback: () => actor.taxResources(1, rollData.fundDice)
                },
                skip: {
                    label: "Skip for now"
                }
            },
            default: "full"
        });
        taxMessage.render(true);
    }
    await actor.addAttributeTest(stat, "Resources", "system.resources", rollData.difficultyGroup, isSuccess);
    if (rollData.addHelp) {
        game.burningwheel.modifiers.grantTests(rollData.difficultyTestTotal, isSuccess);
    }
    const data = {
        name: 'Resources',
        successes: roll.result,
        difficulty: rollData.baseDifficulty,
        obstacleTotal: rollData.difficultyTotal,
        nameClass: getRollNameClass(stat.open, stat.shade),
        success: isSuccess,
        rolls: roll.dice[0].results,
        difficultyGroup: rollData.difficultyGroup,
        dieSources: rollData.dieSources,
        penaltySources: rollData.obSources,
        fateReroll,
        callons
    };
    const messageHtml = await renderTemplate(templates.pcRollMessage, data);
    return ChatMessage.create({
        content: messageHtml,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}
