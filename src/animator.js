import Keyframe from './keyframe.js';

export default class Animator {

    LINEAR = (x) => x;
    EASE_IN = (x) => x * x;
    EASE_OUT = (x) => x * (2 - x);
    EASE_IN_OUT = (x) => x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;

    /*
    * Constructor for the Animator class 
    * @param {Object} initialValues - The initial values of the properties that the animator will affect {property: value, ...}
    */
    constructor (initialValues) {
        this.initialValues = initialValues;
        this.keyframes = [];
    }

    /*
    * Adds a keyframe to the animator
    * @param {number} timeStamp - The time in seconds at which the keyframe occurs
    * @param {string} property - The property that the keyframe affects (e.g. 'fov', 'yaw')
    * @param {number} value - The value of the property at the keyframe
    * @param {string} easing - The easing function describing the transition to this keyframe of type function
    */
    addKeyframe (timeStamp, property, value, easing) {
        this.keyframes.push(new Keyframe(timeStamp, property, value, easing));
    }

    /*
    * Gets the values of the properties at a given time
    * @param {number} time - The time in seconds at which to get the values
    * @returns {Object} - The values of the properties at the given time {property: value, ...}
    */
    getValuesAtTime (time) {
        let values = {};
        for (let property in this.initialValues) {
            let previousKeyframe = this.getPreviousKeyframe(time, property);
            let nextKeyframe = this.getNextKeyframe(time, property);

            const previousValue = this.initialValues[property];
            const nextValue = this.initialValues[property];
            const previousTime = 0;
            const nextTime = time;

            if (previousKeyframe) {
                previousValue = previousKeyframe.value;
                previousTime = previousKeyframe.timeStamp;

                nextValue = previousKeyframe.value;
            }

            if (nextKeyframe) {
                nextValue = nextKeyframe.value;
                nextTime = nextKeyframe.timeStamp;
            }

            const timeFraction = (time - previousTime) / (nextTime - previousTime);
            const easing = nextKeyframe ? nextKeyframe.easing : this.LINEAR;

            values[property] = easing(timeFraction) * (nextValue - previousValue) + previousValue;
        }
        return values;
    }

    getKeyframes () {
        return this.keyframes;
    }

    getPreviousKeyframe (time, property) {
        let previousKeyframe = null;
        for (let i = 0; i < this.keyframes.length; i++) {
            if (this.keyframes[i].timeStamp < time && this.keyframes[i].property === property) {
                previousKeyframe = this.keyframes[i];
            }
        }
        return previousKeyframe;
    }

    getNextKeyframe (time, property) {
        let nextKeyframe = null;
        for (let i = 0; i < this.keyframes.length; i++) {
            if (this.keyframes[i].timeStamp > time && this.keyframes[i].property === property) {
                nextKeyframe = this.keyframes[i];
                break;
            }
        }
        return nextKeyframe;
    }
}