"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "data");

const FILE_SCHEMAS = Object.freeze({
  "autoreplies.json": {
    type: "object",
  },
  "badWords.json": {
    type: "object",
  },
  "blackList.json": {
    type: "object",
  },
  "whiteList.json": {
    type: "object",
  },
});

function validateJsonData(filename, data) {
  const schema = FILE_SCHEMAS[filename];

  if (!schema) {
    throw new Error(`İzin verilmeyen JSON dosyası: ${filename}`);
  }

  if (schema.type === "object") {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new TypeError(`${filename} bir JSON nesnesi içermelidir.`);
    }
  }

  if (schema.type === "array" && !Array.isArray(data)) {
    throw new TypeError(`${filename} bir JSON dizisi içermelidir.`);
  }

  return data;
}

function resolveDataFile(filename) {
  if (!Object.hasOwn(FILE_SCHEMAS, filename)) {
    throw new Error(`İzin verilmeyen JSON dosyası: ${filename}`);
  }

  return path.join(DATA_DIR, filename);
}

async function readJsonFile(filename) {
  const filePath = resolveDataFile(filename);
  const content = await fs.readFile(filePath, "utf8");

  let data;

  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new Error(`${filename} dosyasındaki JSON geçersiz: ${error.message}`);
  }

  return validateJsonData(filename, data);
}

async function writeJsonFile(filename, data) {
  const filePath = resolveDataFile(filename);

  validateJsonData(filename, data);

  await fs.mkdir(DATA_DIR, { recursive: true });

  // JSON çıktısını yazmadan önce oluştur.
  const content = `${JSON.stringify(data, null, 2)}\n`;

  // Mevcut dosyanın yedeğini al.
  try {
    await fs.access(filePath);

    const backupPath = `${filePath}.bak`;
    await fs.copyFile(filePath, backupPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const tempPath = `${filePath}.tmp`;

  try {
    await fs.writeFile(tempPath, content, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }

  return {
    success: true,
    filename,
  };
}

module.exports = {
  FILE_SCHEMAS,
  readJsonFile,
  writeJsonFile,
};
