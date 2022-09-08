export async function task041() {
    // add attack array to all weapons
    const actors = Array.from(game.actors?.values() || []);
    for (const actor of actors) {
        for (const ownedItem of Array.from(actor.items.values())) {
            if (["melee weapon"].indexOf(ownedItem.type) !== -1) {
                const attackData = {
                    attackName: "",
                    power: parseInt(ownedItem.system.power),
                    add: parseInt(ownedItem.system.add),
                    vsArmor: parseInt(ownedItem.system.vsArmor),
                    weaponSpeed: ownedItem.system.weaponSpeed,
                    weaponLength: ownedItem.system.weaponLength
                };
                await ownedItem.update({ data: { attacks: [attackData] } }, {});
            }
        }
    }
    const packs = Array.from(game.packs?.values() || []);
    for (const pack of packs) {
        if (pack.documentName === "Item") {
            const packItems = await pack.getDocuments();
            for (const item of Array.from(packItems.values())) {
                if (["melee weapon"].indexOf(item.type) !== -1) {
                    const attackData = {
                        attackName: "",
                        power: parseInt(item.system.power),
                        add: parseInt(item.system.add),
                        vsArmor: parseInt(item.system.vsArmor),
                        weaponSpeed: item.system.weaponSpeed,
                        weaponLength: item.system.weaponLength
                    };
                    await item.update({ data: { attacks: [attackData] } }, {});
                }
            }
        }
    }
}
