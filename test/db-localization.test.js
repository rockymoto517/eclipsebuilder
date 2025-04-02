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
					})
				})
			}
		})
	})
})
