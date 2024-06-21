export default class Keyframe {
    constructor (timeStamp, property, value, easing) {
        this.timeStamp = timeStamp;
        this.property = property;
        this.value = value;
        this.easing = easing;
    }
}