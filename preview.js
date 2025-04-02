const readline = require("readline");
const { stdin, stdout, exit } = require("process");
const { Worker } = require("worker_threads");

const server = new Worker("./pd2builder.js");

const rl = readline.createInterface({
    input: stdin,
    output: stdout,
});

rl.question("Enter (q) to quit.\n", (input) => {
    if (input.trim().toLowerCase() === "q") {
        console.log("Exiting...\n");
        rl.close();
        exit();
    } else {
        console.log("I'm stuff\n");
    }
});

