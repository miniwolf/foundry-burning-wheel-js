export class BWSettingSheet extends ActorSheet {
    get template() {
        return "systems/burningwheel/templates/setting-sheet.hbs";
    }
    get actor() {
        return super.actor;
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["bw-app"],
            width: 600
        });
    }
    getData() {
        return {
            actor: this.actor,
            data: this.actor.system,
            lifepaths: Array.from(this.actor.items.values()).map(i => i.system).sort((a, b) => a.system.order - b.system.order),
            editable: this.isEditable
        };
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.lifepath[draggable="true"]').on('dragstart', (e) => {
            const actor = this.actor;
            const item = actor.items.get(e.target.dataset.id || "");
            const dragData = {
                actorId: actor.id,
                id: item.id,
                type: "Item",
                data: item.system,
                pack: actor.compendium ? actor.compendium.collection : undefined
            };
            if (e.originalEvent?.systemTransfer) {
                e.originalEvent.systemTransfer.setData('text/plain', JSON.stringify(dragData));
            }
        });
        html.find('i[data-action="delete"]').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.target.dataset.id || "";
            this.actor.deleteEmbeddedDocuments("Item", [id]);
        });
        html.find('.lifepath').on('click', (e) => {
            const id = e.currentTarget.dataset.id || "";
            this.actor.items.get(id)?.sheet?.render(true);
        });
        const dropAreas = html.find('.drop-area').toArray().map(e => $(e));
        let activeDropArea;
        let enterCount = 0;
        html.find('.lifepath-list').on('dragover', evt => {
            const yPos = evt.pageY || 0;
            if (activeDropArea) {
                const topLimit = (activeDropArea.offset()?.top || 0) - 30;
                const bottomLimit = (activeDropArea.offset()?.top || 0) + (activeDropArea.height() || 0) + 30;
                if (yPos < topLimit || yPos > bottomLimit) {
                    activeDropArea.removeClass("show-drop");
                    activeDropArea = undefined;
                }
            }
            else {
                for (const area of dropAreas) {
                    const top = area.offset()?.top || 0;
                    const topLimit = top - 20;
                    const bottomLimit = top + 20;
                    if (yPos <= bottomLimit && yPos >= topLimit) {
                        activeDropArea = $(area);
                        activeDropArea.addClass("show-drop");
                        return;
                    }
                }
            }
        }).on('dragenter', () => {
            enterCount++;
        }).on('dragleave', () => {
            enterCount--;
            if (!enterCount) {
                activeDropArea?.removeClass("show-drop");
                activeDropArea = undefined;
            }
        }).on('drop', ev => {
            enterCount = 0;
            if (activeDropArea) {
                ev.stopPropagation();
                const index = parseInt(activeDropArea.system("index") || "0");
                const event = ev.originalEvent;
                if (event) {
                    this.insertItemAtIndex(event, index);
                }
                activeDropArea?.removeClass("show-drop");
                activeDropArea = undefined;
            }
        });
    }
    async insertItemAtIndex(event, index) {
        let dragData;
        try {
            dragData = JSON.parse(event.systemTransfer?.getData('text/plain') || "");
        }
        catch (err) {
            console.error(err);
            return;
        }
        if (dragData.type !== "Item") {
            return;
        }
        const sortedItems = Array.from(this.actor.items.values()).sort((a, b) => a.system.order - b.system.order);
        if (dragData.actorId === this.actor.id) {
            // we need to just update the index of the entry
            const item = this.actor.items.get(dragData.id || "");
            await item.update({ "system.order": index }, {});
        }
        else {
            // we need to get the item data and add it to the setting sheet
            let itemData;
            if (dragData.system) {
                itemData = dragData.system;
            }
            else if (dragData.pack) {
                itemData = (await game.packs?.find(p => p.collection === dragData.pack).getDocument(dragData.id || ""))?.system;
            }
            else if (dragData.actorId) {
                itemData = (game.actors?.find((a) => a.id === dragData.actorId))?.items.get(dragData.id || "")?.system;
            }
            else {
                itemData = game.items?.find((i) => i.id === dragData.id)?.system;
            }
            // if our item is actually a lifepath we need to add it, otherwise abort.
            if (itemData.type === "lifepath") {
                itemData.system.order = index;
                await this.actor.createEmbeddedDocuments("Item", [itemData]);
            }
            else {
                return;
            }
        }
        const updateData = [];
        for (let i = 0; i < index; i++) {
            const item = sortedItems[i];
            if (item.id !== dragData.id) {
                updateData.push({ "_id": sortedItems[i].id, 'data.order': i });
            }
        }
        for (let i = index; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            if (item.id !== dragData.id) {
                updateData.push({ "_id": sortedItems[i].id, 'data.order': i + 1 });
            }
        }
        // this.actor.updateEmbeddedEntity("OwnedItem", updateData);
        this.actor.updateEmbeddedDocuments("Item", updateData);
    }
}
