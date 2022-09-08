import { BWItem } from "./item.js";
export class Lifepath extends BWItem {
    get type() {
        return super.type;
    }
    prepareData() {
        super.prepareData();
        const statSign = this.system.statBoost === "none" ? "" : (this.system.subtractStats ? "-" : "+");
        this.system.statString = statSign + statMap[this.system.statBoost];
    }
}
const statMap = {
    "none": "&mdash;",
    "mental": "1 M",
    "physical": "1 P",
    "either": "1 M/P",
    "both": "1 M,P"
};
