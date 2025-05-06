/* eslint no-undef: "off" */
const assert = require("assert");
const fs = require("fs");

describe("English localization agrees with the Skill DB", function() {
    fs.readFile("./public/db/skills.json", "utf8", (e, dbData) => {
        if (e) {
            console.error("Error:", e);
            return;
        }

        const skills = JSON.parse(dbData);
        fs.readFile("./public/lang/en-us.json", "utf8", (e2, locData) => {
            if (e2) {
                console.error("Error:", e2);
                return;
            }

            const locSkills = JSON.parse(locData).skills;
            for (const key in skills) {
                describe(key, function() {
                    it("should match in en-us.json and skills.json", function() {
                        assert.strictEqual(skills[key].name, locSkills[key].name);
                        assert.strictEqual(skills[key].description, locSkills[key].description);
                    });
                });
            }
        });
    });
});

describe("English localization agrees with the deck DB", function() {
    fs.readFile("./public/db/perk_cards.json", "utf8", (e, dbData) => {
        if (e) {
            console.error("Error:", e);
            return;
        }

        const cards = JSON.parse(dbData);
        fs.readFile("./public/lang/en-us.json", "utf8", (e2, locData) => {
            if (e2) {
                console.error("Error:", e2);
                return;
            }

            const locCards = JSON.parse(locData).perk_cards;
            for (const key in cards) {
                describe(key, function() {
                    it("should match in en-us.json and perk_cards.json", function() {
                        assert.strictEqual(cards[key].name, locCards[key].name);
                        assert.strictEqual(cards[key].description, locCards[key].description);
                    });
                });
            }
        });
    });
});
