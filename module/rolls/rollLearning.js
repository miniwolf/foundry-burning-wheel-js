import { buildRerollData, getRollNameClass, rollDice, templates, extractSelectString, maybeExpendTools, extractRollData, mergeDialogData, getSplitPoolText, getSplitPoolRoll } from "./rolls.js";
import { buildHelpDialog } from "../dialogs/buildHelpDialog.js";
export async function handleLearningRollEvent(rollOptions) {
    const actor = rollOptions.sheet.actor;
    const skillId = rollOptions.target.dataset.skillId || "";
    const skill = rollOptions.sheet.actor.items.get(skillId);
    return handleLearningRoll({ actor, skill, ...rollOptions });
}
export function handleLearningRoll({ actor, skill, extraInfo, dataPreset, onRollCallback }) {
    if (skill.system.root2) {
        return new Dialog({
            title: "Pick Root Stat",
            content: "<p>The skill being learned is derived from two roots. Pick one to use for the roll.</p>",
            buttons: {
                root1: {
                    label: skill.system.root1.titleCase(),
                    callback: () => {
                        return buildLearningDialog({ actor, skill, statName: skill.system.root1, extraInfo, dataPreset, onRollCallback });
                    }
                },
                root2: {
                    label: skill.system.root2.titleCase(),
                    callback: () => {
                        return buildLearningDialog({ actor, skill, statName: skill.system.root2, extraInfo, dataPreset, onRollCallback });
                    }
                }
            },
            default: "root1"
        }).render(true);
    }
    return buildLearningDialog({ actor, skill, statName: skill.system.root1, extraInfo, dataPreset, onRollCallback });
}
async function buildLearningDialog({ skill, statName, actor, extraInfo, dataPreset, onRollCallback }) {
    const rollModifiers = actor.getRollModifiers(skill.name).concat(actor.getRollModifiers(statName));
    const stat = getProperty(actor.system, statName);
    if (dataPreset && dataPreset.addHelp) {
        // add a test log instead of testing
        return buildHelpDialog({
            exponent: stat.exp,
            path: `data.${statName}`,
            actor,
            helpedWith: statName
        });
    }
    let tax = 0;
    if (statName.toLowerCase() === "will") {
        tax = actor.system.willTax;
    }
    else if (statName.toLowerCase() === "forte") {
        tax = actor.system.forteTax;
    }
    if (dataPreset) {
        if (dataPreset.optionalDiceModifiers) {
            dataPreset.optionalDiceModifiers.concat(...rollModifiers.filter(r => r.optional && r.dice));
        }
        if (dataPreset.optionalObModifiers) {
            dataPreset.optionalObModifiers.concat(...rollModifiers.filter(r => r.optional && r.obstacle));
        }
    }
    const data = mergeDialogData({
        name: `Beginner's Luck ${skill.name} Test`,
        difficulty: 3,
        bonusDice: 0,
        arthaDice: 0,
        tax,
        woundDice: actor.system.ptgs.woundDice,
        obPenalty: actor.system.ptgs.obPenalty,
        toolkits: actor.system.toolkits,
        needsToolkit: skill.system.tools,
        learning: true,
        skill: stat,
        optionalDiceModifiers: rollModifiers.filter(r => r.optional && r.dice),
        optionalObModifiers: rollModifiers.filter(r => r.optional && r.obstacle),
        showDifficulty: !game.burningwheel.useGmDifficulty,
        showObstacles: !game.burningwheel.useGmDifficulty
            || !!actor.system.ptgs.obPenalty
            || (dataPreset && dataPreset.obModifiers && !!dataPreset.obModifiers.length || false)
    }, dataPreset);
    const html = await renderTemplate(templates.pcRollDialog, data);
    return new Promise(_resolve => new Dialog({
        title: `${skill.name}`,
        content: html,
        buttons: {
            roll: {
                label: "Roll",
                callback: async (dialogHtml) => learningRollCallback(dialogHtml, skill, statName, actor, extraInfo, onRollCallback)
            }
        },
        default: "roll"
    }).render(true));
}
async function learningRollCallback(dialogHtml, skill, statName, actor, extraInfo, onRollCallback) {
    const rollData = extractRollData(dialogHtml);
    const stat = getProperty(actor.system, statName);
    const roll = await rollDice(rollData.diceTotal, stat.open, stat.shade);
    if (!roll) {
        return;
    }
    const isSuccessful = parseInt(roll.result) >= rollData.difficultyTotal;
    let splitPoolString;
    let splitPoolRoll;
    if (rollData.splitPool) {
        splitPoolRoll = await getSplitPoolRoll(rollData.splitPool, skill.system.open, skill.system.shade);
        splitPoolString = getSplitPoolText(splitPoolRoll);
    }
    extraInfo = `${splitPoolString || ""} ${extraInfo || ""}`;
    const fateReroll = buildRerollData({ actor, roll, accessor: `data.${statName}`, splitPoolRoll });
    if (fateReroll) {
        fateReroll.type = "learning";
        fateReroll.learningTarget = statName;
    }
    const callons = actor.getCallons(skill.name).map(s => {
        return {
            label: s,
            type: "learning",
            learningTarget: statName,
            ...buildRerollData({ actor, roll, accessor: `data.${statName}`, splitPoolRoll })
        };
    });
    if (skill.system.tools) {
        const toolkitId = extractSelectString(dialogHtml, "toolkitId") || '';
        const tools = actor.items.get(toolkitId);
        if (tools) {
            const { expended, text } = await maybeExpendTools(tools);
            extraInfo = extraInfo ? `${extraInfo}${text}` : text;
            if (expended) {
                tools.update({
                    "system.isExpended": true
                }, {});
            }
        }
    }
    actor.updateArthaForStat(`data.${statName}`, rollData.persona, rollData.deeds);
    const afterLearningTest = async (fr) => {
        if (rollData.addHelp) {
            game.burningwheel.modifiers.grantTests(rollData.difficultyTestTotal, isSuccessful);
        }
        const data = {
            name: `Beginner's Luck ${skill.system.name}`,
            successes: roll.result,
            splitSuccesses: splitPoolRoll ? splitPoolRoll.result : undefined,
            difficulty: rollData.baseDifficulty,
            obstacleTotal: rollData.difficultyTotal,
            nameClass: getRollNameClass(stat.open, stat.shade),
            success: isSuccessful,
            rolls: roll.dice[0].results,
            difficultyGroup: rollData.difficultyGroup,
            penaltySources: rollData.obSources,
            dieSources: rollData.dieSources,
            fateReroll: fr,
            callons,
            extraInfo
        };
        const messageHtml = await renderTemplate(templates.pcRollMessage, data);
        if (onRollCallback) {
            onRollCallback();
        }
        return ChatMessage.create({
            content: messageHtml,
            speaker: ChatMessage.getSpeaker({ actor })
        });
    };
    return advanceLearning(skill, statName, actor, rollData.difficultyGroup, isSuccessful, fateReroll, afterLearningTest);
}
async function advanceLearning(skill, statName, owner, difficultyGroup, isSuccessful, fr, cb) {
    switch (difficultyGroup) {
        default:
            return advanceBaseStat(skill, owner, statName, difficultyGroup, isSuccessful, fr, cb);
        case "Routine":
            return advanceLearningProgress(skill, fr, cb);
        case "Routine/Difficult":
            // we can either apply this to the base stat or to the learning
            const dialog = new Dialog({
                title: "Pick where to assign the test",
                content: "<p>This test can count as routine of difficult for the purposes of advancement</p><p>Pick which option you'd prefer.</p>",
                buttons: {
                    skill: {
                        label: "Apply as Routine",
                        callback: async () => advanceLearningProgress(skill, fr, cb)
                    },
                    stat: {
                        label: "Apply as Difficult",
                        callback: async () => advanceBaseStat(skill, owner, statName, "Difficult", isSuccessful, fr, cb)
                    }
                },
                default: "skill"
            });
            return dialog.render(true);
    }
}
async function advanceBaseStat(_skill, owner, statName, difficultyGroup, isSuccessful, fr, cb) {
    const accessor = `data.${statName.toLowerCase()}`;
    const rootStat = getProperty(owner, `data.${accessor}`);
    if (statName === "custom1" || statName === "custom2") {
        statName = owner.system[statName].name.titleCase();
        await owner.addAttributeTest(rootStat, statName, accessor, difficultyGroup, isSuccessful);
    }
    else {
        await owner.addStatTest(rootStat, statName, accessor, difficultyGroup, isSuccessful);
    }
    return cb(fr);
}
async function advanceLearningProgress(skill, fr, cb) {
    skill.addTest("Routine");
    return cb(fr);
}
