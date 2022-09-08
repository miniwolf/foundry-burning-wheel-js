export async function task061() {
    const items = Array.from(game.items?.values() || []);
    const updateInfo = {};
    for (const item of items) {
        const updateData = updateItem(item, updateInfo);
        if (Object.values(updateData).length) {
            await item.update(updateData, {});
        }
    }
    const actors = Array.from(game.actors?.values() || []);
    for (const actor of actors) {
        for (const ownedItem of Array.from(actor.items?.values() || [])) {
            const updateData = updateItem(ownedItem, updateInfo);
            if (Object.values(updateData).length) {
                await ownedItem.update(updateData, {});
            }
        }
    }
    const packs = Array.from(game.packs?.values() || []);
    for (const pack of packs) {
        if (pack.documentName === "Item") {
            const packItems = await pack.getDocuments();
            for (const item of packItems) {
                const updateData = updateItem(item, updateInfo);
                if (Object.values(updateData).length) {
                    await item.update(updateData, {});
                }
            }
        }
    }
    const updatedTypes = Object.keys(updateInfo);
    const parts = [];
    for (const types of updatedTypes) {
        parts.push(`${updateInfo[types]} ${types}s`);
    }
    const message = updatedTypes.length ? `Updated ${parts.join(", ")}.` : "No entities needed to be updated.";
    ui.notifications?.notify(message, "info");
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateToNumber(value, path, data) {
    if (typeof value === "number") {
        return;
    }
    if (value && typeof value === "object") {
        // this is an array
        value = value[0];
    }
    if (typeof value === "string") {
        value = parseInt(value);
    }
    if (value !== null) {
        data[path] = value;
    }
}
function updateItem(item, updateInfo) {
    let updateData = {};
    switch (item.system.type) {
        case "armor":
            updateData = updateArmor(item);
            break;
        case "skill":
            updateData = updateSkill(item);
            break;
        case "trait":
            updateData = updateTrait(item);
            break;
        case "spell":
            updateData = updateSpell(item);
            break;
        case "ranged weapon":
            updateData = updateRanged(item);
            break;
        case "reputation":
            updateData = updateReputation(item);
            break;
        case "affiliation":
            updateData = updateAffiliation(item);
    }
    if (Object.values(updateData).length) {
        if (updateInfo[item.system.type]) {
            updateInfo[item.system.type]++;
        }
        else {
            updateInfo[item.system.type] = 1;
        }
    }
    return updateData;
}
function updateArmor(item) {
    const data = {};
    updateToNumber(item.system.dice, "system.dice", data);
    updateToNumber(item.system.damageHelm, "system.damageHelm", data);
    updateToNumber(item.system.damageLeftArm, "system.damageLeftArm", data);
    updateToNumber(item.system.damageLeftLeg, "system.damageLeftLeg", data);
    updateToNumber(item.system.damageRightArm, "system.damageRightArm", data);
    updateToNumber(item.system.damageRightLeg, "system.damageRightLeg", data);
    updateToNumber(item.system.damageTorso, "system.damageTorso", data);
    updateToNumber(item.system.damageShield, "system.damageShield", data);
    return data;
}
function updateSkill(item) {
    const data = {};
    updateToNumber(item.system.exp, "system.exp", data);
    updateToNumber(item.system.challenging, "system.challenging", data);
    updateToNumber(item.system.routine, "system.routine", data);
    updateToNumber(item.system.difficult, "system.difficult", data);
    updateToNumber(item.system.fate, "system.fate", data);
    updateToNumber(item.system.persona, "system.persona", data);
    updateToNumber(item.system.deeds, "system.deeds", data);
    updateToNumber(item.system.learningProgress, "system.learningProgress", data);
    return data;
}
function updateTrait(item) {
    const data = {};
    updateToNumber(item.system.affiliationDice, "system.affiliationDice", data);
    updateToNumber(item.system.dieModifier, "system.dieModifier", data);
    updateToNumber(item.system.obModifier, "system.obModifier", data);
    updateToNumber(item.system.reputationDice, "system.reputationDice", data);
    updateToNumber(item.system.aptitudeModifier, "system.aptitudeModifier", data);
    return data;
}
function updateSpell(item) {
    const data = {};
    updateToNumber(item.system.willDamageBonus, "system.willDamageBonus", data);
    updateToNumber(item.system.learningProgress, "system.learningProgress", data);
    updateToNumber(item.system.va, "system.va", data);
    updateToNumber(item.system.optimalRange, "system.optimalRange", data);
    updateToNumber(item.system.extremeRange, "system.extremeRange", data);
    return data;
}
function updateRanged(item) {
    const data = {};
    updateToNumber(item.data.incidental, "data.incidental", data);
    updateToNumber(item.data.incidentalRoll, "data.incidentalRoll", data);
    updateToNumber(item.system.mark, "system.mark", data);
    updateToNumber(item.system.markRoll, "system.markRoll", data);
    updateToNumber(item.system.superb, "system.superb", data);
    updateToNumber(item.system.vsArmor, "system.vsArmor", data);
    updateToNumber(item.system.optimalRange, "system.optimalRange", data);
    updateToNumber(item.system.extremeRange, "system.extremeRange", data);
    updateToNumber(item.system.powerBonus, "system.powerBonus", data);
    return data;
}
function updateReputation(item) {
    const data = {};
    updateToNumber(item.system.dice, "system.dice", data);
    return data;
}
function updateAffiliation(item) {
    const data = {};
    updateToNumber(item.system.dice, "system.dice", data);
    return data;
}
