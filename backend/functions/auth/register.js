"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions/auth/register.ts
var register_exports = {};
__export(register_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(register_exports);

// src/utils/response.ts
function successResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
      "Access-Control-Allow-Credentials": "false",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  };
}
function errorResponse(message, statusCode = 500) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
      "Access-Control-Allow-Credentials": "false",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ error: message })
  };
}

// src/utils/dynamodb.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_util_dynamodb = require("@aws-sdk/util-dynamodb");
var dynamoClient = new import_client_dynamodb.DynamoDBClient({ region: process.env.REGION || "us-east-1" });
async function putItem(tableName, item) {
  const command = new import_client_dynamodb.PutItemCommand({
    TableName: tableName,
    Item: (0, import_util_dynamodb.marshall)(item)
  });
  await dynamoClient.send(command);
}
async function queryItems(tableName, keyConditionExpression, expressionAttributeValues, indexName) {
  const commandParams = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: (0, import_util_dynamodb.marshall)(expressionAttributeValues)
  };
  if (indexName) {
    commandParams.IndexName = indexName;
  }
  const command = new import_client_dynamodb.QueryCommand(commandParams);
  const response = await dynamoClient.send(command);
  return (response.Items || []).map((item) => (0, import_util_dynamodb.unmarshall)(item));
}

// ../node_modules/uuid/dist/esm-node/rng.js
var import_crypto = __toESM(require("crypto"));
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    import_crypto.default.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// ../node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

// ../node_modules/uuid/dist/esm-node/native.js
var import_crypto2 = __toESM(require("crypto"));
var native_default = {
  randomUUID: import_crypto2.default.randomUUID
};

// ../node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// functions/auth/register.ts
var crypto3 = __toESM(require("crypto"));
var USERS_TABLE = process.env.USERS_TABLE || "";
var handler = async (event) => {
  try {
    if (!event.body) {
      return errorResponse("Request body is required", 400);
    }
    const { email, password, name } = JSON.parse(event.body);
    if (!email || !password || !name) {
      return errorResponse("Email, password, and name are required", 400);
    }
    const existingUsers = await queryItems(
      USERS_TABLE,
      "email = :email",
      { ":email": email },
      "email-index"
    );
    if (existingUsers.length > 0) {
      return errorResponse("User already exists with this email", 409);
    }
    const userId = v4_default();
    const passwordHash = crypto3.createHash("sha256").update(password).digest("hex");
    const newUser = {
      userId,
      email,
      name,
      password: passwordHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      companyDetails: {}
      // Initialize empty
    };
    await putItem(USERS_TABLE, newUser);
    const token = `${userId}:${Date.now()}`;
    const { password: _, ...userWithoutPassword } = newUser;
    return successResponse({ token, user: userWithoutPassword }, 201);
  } catch (error) {
    console.error("Error registering:", error);
    return errorResponse(error.message || "Failed to register", 500);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=register.js.map
