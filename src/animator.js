import Keyframe from './keyframe.js';

export default class Animator {
    INSTANT = (x) => 0;
    LINEAR = (x) => x;
    EASE_IN = (x) => x * x;
    EASE_OUT = (x) => x * (2 - x);
    EASE_IN_OUT = (x) => x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;

    /*
    * Constructor for the Animator class 
    * @param {Object} initialValues - The initial values of the properties that the animator will affect {property: value, ...}
    */
    constructor (keyframeFileName) {
        this.keyframes = [];

        this.loadKeyframes(keyframeFileName);
    }

    /*
    * Loads keyframes from a JSON file
    * @param {string} keyframeFileName - The name of the JSON file containing the keyframes
    */
    loadKeyframes (keyframeFileName) {
        fetch(keyframeFileName)
            .then(response => response.json())
            .then(data => {

                for (let i = 0; i < data.keyframes.length; i++) {
                    this.addKeyframe(
                        data.keyframes[i].timeStamp, 
                        data.keyframes[i].property, 
                        data.keyframes[i].value, 
                        this[data.keyframes[i].easing] || this.LINEAR
                    );
                }

                this.initialValues = data.initialValues;
            });
    }

    /*
    * Adds a keyframe to the animator
    * @param {number} timeStamp - The frame number at which the keyframe occurs
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
    getValuesAtFrame (frame) {
        let values = {};
        for (let property in this.initialValues) {
            let previousKeyframe = this.getPreviousKeyframe(frame, property);
            let nextKeyframe = this.getNextKeyframe(frame, property);

            let previousValue = this.initialValues[property];
            let nextValue = this.initialValues[property];
            let previousFrame = 0;
            let nextFrame = frame;

            if (previousKeyframe) {
                previousValue = previousKeyframe.value;
                previousFrame = previousKeyframe.timeStamp;

                nextValue = previousKeyframe.value;
            }

            if (nextKeyframe) {
                nextValue = nextKeyframe.value;
                nextFrame = nextKeyframe.timeStamp;
            }

            if (previousKeyframe || nextKeyframe) {
                console.log("Frame: " + frame + " Property: " + property + " Previous: " + previousValue + " Next: " + nextValue + " Previous Frame: " + previousFrame + " Next Frame: " + nextFrame);   
            }

            let timeFraction = (frame - previousFrame) / (nextFrame - previousFrame);
            if(isNaN(timeFraction)) 
                timeFraction = 1;

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
            if (this.keyframes[i].timeStamp <= time && this.keyframes[i].property === property) {
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