const assert = require("assert");
const fs = require("fs");
const { JSDOM } = require("jsdom");

// Make sure that all skills displayed on the mobile
// website have an entry in the skill database
describe("Mobile Skills", function() {
	it("should have entries in the DOM", function(done) {
		JSDOM.fromFile("./pages/mobile.html").then(dom => {
			const document = dom.window.document;
			const spans = document.getElementsByClassName("sk_name");

			fs.readFile("./public/db/skills.json", "utf8", (e, data) => {
				if (e) {
					console.error("Error:", e);
					done(e);
				}

				const skills = JSON.parse(data);
				for (let span of spans) {
					const skill = span.innerHTML.toLowerCase()
					.replaceAll(" ", "_")
					.replaceAll("-", "_") // Mag-fed Specialist
					.replaceAll("'", ""); // Lock n' Load
					describe(skill, function() {
						it("should have an entry in the skill db", function() {
							if (skill !== "work_in_progress") {
								assert.ok(skills[skill]);
							}
						})
					})	
				}
			})
			done();
		})
	})
});
