import { BWItem } from "./item.js";
export class Relationship extends BWItem {
    prepareData() {
        super.prepareData();
        this.system.safeId = this.id;
        if (this.actor && this.actor.system) {
            this.system.aptitude = this.actor.system.circles.exp || 0;
        }
        if (this.system.hateful || this.system.enmity) {
            this.system.cssClass = "relationship-hostile";
        }
        else if (this.system.romantic || this.system.immediateFamily) {
            this.system.cssClass = "relationship-friendly";
        }
        else {
            this.system.cssClass = "relationship-neutral";
        }
    }
}
