/**
 * Class for the use of language files
 */
export default class Language {
    constructor(lang) {
        /**
         * An object filled with strings, functions and more objects
         * @type {Object}
         */
        this.lang;

        this.loadLanguage(lang);
    }

    /**
     * Loads an object that contains strings and objects
     * @param {Object} lang
     */
    loadLanguage(obj) {
        for(const prop in obj) {
            const thing = obj[prop];
            if(typeof thing === "string") {
                Language.LOCATEREGEX.lastIndex = 0;
                const [,...res] = Language.LOCATEREGEX.exec(thing) || [];
                if(res.length === 0) continue;
                obj[prop] = obj => Language.refFormat(Language.replaceFormat(thing, obj.rep), obj.ref);
            } else {
                this.loadLanguage(thing);
            }
        }
        this.lang = obj;
    }

    /**
     * Returns the requested object or string
     * @param {String} loc Location of the wanted value
     * @returns {Object}
     */
    get(loc = "") {
        const array = loc.split(".");
        let res = this.lang;
        for(const value of array) {
            res = res[value];
        }
        return res;
    }

    /**
     * Function to be used when the variable needs to be replaced
     * @static
     * @type {Function}
     * @param {String} x Replacement text
     * @param {String} variable Name of variable
     * @param {String} text Original Text
     * @returns {String}
     */
    static replaceFormat(text, obj) {
        for(const prop in obj) {
            text = text.replace(new RegExp(`%{${prop}}`, "g"), obj[prop]);
        }
        return text;
    }

    /**
     * Used for adapting a certain text to the context
     * @callback parser
     * @param {String} text The text that you need to adapt to
     * @returns {String}
     */

    /**
     * Function to be used when the text has to be referenced
     * @static
     * @type {Function}
     * @param {String} text Original Text
     * @param {Array<parser>} args Replacement function that returns text for each one
     * @returns {String}
     */
    static refFormat(text, args) {
        Language.REFREGEX.lastIndex = 0;
        const [,...replace] = Language.REFREGEX.exec(text) || [];
        if(Array.isArray(args) && replace.length !== args.length) throw new Error("The array should have the same amount of functions as the lang text has variable as!");
        for(let i = 0; i < replace.length; i++) {
            text = text.replace(new RegExp(`&{${replace[i]}}`), args[i](replace[i]));
        }
        return text;
    }
}

/**
 * RegExp that helps locates special variables
 * @static
 * @type {RegExp}
 */
Language.LOCATEREGEX = /(%|&){(.+)}/g;

/**
 * RegExp that helps locates reference variables
 * @static
 * @type {RegExp}
 */
Language.REFREGEX = /&{(.+)}/g;
