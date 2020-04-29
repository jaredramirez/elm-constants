#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const version = "1.0.0";
const argv = yargs
  .option("version", {
    alias: "v",
    description: "Print the installed version",
    type: "boolean",
  })
  .option("no-dotenv", {
    description: "Dont' use dotenv",
    type: "boolean",
  })
  .option("env-path", {
    alias: "p",
    description: "Path to env file",
    type: "string",
  })
  .option("config", {
    alias: "c",
    description: "Path to config file",
    type: "string",
  })
  .help()
  .alias("help", "h").argv;

if (argv.version) {
  console.log(version);
}

let config;
try {
  const configFilePath = path.normalize(
    argv.config ? argv.config : "./elm-constants.json"
  );
  if (!fs.existsSync(configFilePath)) {
    throw new Error(
      "I couldn't find the config file at \"" + configFilePath + '"'
    );
  }

  const configFile = fs.readFileSync(configFilePath);
  config = JSON.parse(configFile);

  // Validations

  if (!config.path) {
    throw new Error('I couldn\'t the field "path" in the config file.');
  }
  if (typeof config.path !== "string") {
    throw new Error('The field "path" in the config file wasn\'t a string.');
  }

  if (!config.moduleName) {
    throw new Error('I couldn\'t the field "moduleName" in the config file.');
  }
  if (typeof config.moduleName !== "string") {
    throw new Error(
      'The field "moduleName" in the config file wasn\'t a string.'
    );
  }

  if (!config.values) {
    throw new Error('I couldn\'t the field "values" in the config file.');
  }
  if (!Array.isArray(config.values)) {
    throw new Error('The field "values" in the config file wasn\'t an array.');
  }
  if (config.values.length === 0) {
    throw new Error(
      'The field "values" in the config file was empty. ' +
        "There's nothing for me to do!"
    );
  }

  if (typeof argv.dotenv !== "boolean" || argv.dotenv !== false) {
    let envPath = path.resolve(process.cwd(), ".env");
    if (typeof argv.envPath === "string") {
      const PATH_REGEXP = /^.*\.(env)($|\..+$)/;
      if (!fs.existsSync(argv.envPath) || !PATH_REGEXP.test(argv.envPath)) {
        throw new Error(`I couldn't find an env file at "${argv.envPath}"`);
      }
      envPath = argv.envPath;
    }

    if (process.env.NODE_ENV !== "production") {
      require("dotenv").config({
        path: envPath,
      });
    }
  }

  const isValidElmVar = (str) => new RegExp(/^[a-z]\w+$/).test(str);
  const capitalizeFirstLetter = (string) =>
    string.charAt(0).toUpperCase() + string.slice(1);
  const lowercaseFirstLetter = (string) =>
    string.charAt(0).toLowerCase() + string.slice(1);

  const values = config.values.map((value) => {
    if (Array.isArray(value)) {
      if (value.length !== 2) {
        throw new Error(
          "The array to alias a value can only have two elements."
        );
      }
      if (typeof value[0] !== "string") {
        throw new Error('"' + value[0] + '" is not a string');
      }
      if (typeof value[1] !== "string") {
        throw new Error('"' + value[1] + '" is not a string');
      }
      if (!isValidElmVar(value[1])) {
        throw new Error('"' + value[1] + '" is not a valid Elm variable.');
      }
      return value;
    }

    if (typeof value === "string") {
      let transformed = value
        .toLowerCase()
        .split("_")
        .map(capitalizeFirstLetter)
        .join("");
      transformed = lowercaseFirstLetter(transformed);

      if (!isValidElmVar(transformed)) {
        throw new Error(
          "The env var you passed could not be automatically converted " +
            "into a valid Elm variable name. Try aliasing it instead."
        );
      }

      return [value, transformed];
    } else {
      throw new Error(
        "If you're specifying a value, it must a string " +
          "that's the name of ENV variable."
      );
    }
  });

  // Generate declarations

  const toElmValue = (name, value) =>
    `${name} : String\n` + `${name} =\n` + `    "${value}"\n`;
  const [exposingValues, elmValues] = values.reduce(
    (acc, cur) => {
      const [envValueName, elmName] = Array.isArray(cur) ? cur : [cur, cur];
      const envValue = process.env[envValueName];
      if (envValue === null || envValue === undefined) {
        throw new Error(
          `The env variable "${envValueName}" wasn't found. ` +
            `Maybe you forgot to set it?`
        );
      }

      const [accExposing, accElmValue] = acc;
      return [
        [elmName].concat(accExposing),
        [toElmValue(elmName, envValue)].concat(accElmValue),
      ];
    },
    [[], []]
  );

  if (exposingValues.length === 0) {
    throw new Error(
      "I couldn't find any of the environment variable you specified, " +
        "so I have nothing to generate!"
    );
  }

  const generated =
    `module ${config.moduleName} exposing (${exposingValues.join(", ")})\n` +
    "\n" +
    "\n" +
    elmValues.join("\n\n");

  // Write to file

  const fileToGenerate = path.normalize(
    `${config.path}/${config.moduleName}.elm`
  );
  fs.writeFileSync(fileToGenerate, generated);
  console.log(
    `${exposingValues.length} constants written to ${fileToGenerate}`
  );
  process.exit(0);
} catch (e) {
  if (e && typeof e.errno === "number") {
    if (e.errno === -2) {
      console.log(
        "I couldn't find the path " +
          (config && config.path ? '"' + config.path + '" ' : "") +
          "you specified in the config. " +
          " Maybe you forgot to create it?"
      );
      process.exit(1);
      return;
    }
  }

  console.log(e.message);
  process.exit(1);
}
