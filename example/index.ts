/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * An example Express server showing off a simple integration of @simplewebauthn/server.
 *
 * The webpages served from ./public use @simplewebauthn/browser.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';

import express from 'express';
import session from 'express-session';
import memoryStore from 'memorystore';
import dotenv from 'dotenv';

dotenv.config();

import {
  // Registration
  generateRegistrationOptions,
  verifyRegistrationResponse,
  // Authentication
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';

import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorDevice,
} from '@simplewebauthn/typescript-types';

import { LoggedInUser } from './example-server';

const app = express();
const MemoryStore = memoryStore(session);

const {
  ENABLE_CONFORMANCE,
  ENABLE_HTTPS,
  RP_ID = 'localhost',
} = process.env;

app.use(express.static('./public/'));
app.use(express.json());
app.use(
  session({
    secret: 'secret123',
    saveUninitialized: true,
    resave: false,
    cookie: {
      maxAge: 86400000,
      httpOnly: true, // Ensure to not expose session cookies to clientside scripts
    },
    store: new MemoryStore({
      checkPeriod: 86_400_000, // prune expired entries every 24h
    }),
  }),
);

/**
 * If the words "metadata statements" mean anything to you, you'll want to enable this route. It
 * contains an example of a more complex deployment of SimpleWebAuthn with support enabled for the
 * FIDO Metadata Service. This enables greater control over the types of authenticators that can
 * interact with the Rely Party (a.k.a. "RP", a.k.a. "this server").
 */
if (ENABLE_CONFORMANCE === 'true') {
  import('./fido-conformance').then(({ fidoRouteSuffix, fidoConformanceRouter }) => {
    app.use(fidoRouteSuffix, fidoConformanceRouter);
  });
}

/**
 * RP ID represents the "scope" of websites on which a authenticator should be usable. The Origin
 * represents the expected URL from which registration or authentication occurs.
 */
export const rpID = RP_ID;
// This value is set at the bottom of page as part of server initialization (the empty string is
// to appease TypeScript until we determine the expected origin based on whether or not HTTPS
// support is enabled)
export let expectedOrigin = '';

/**
 * 2FA and Passwordless WebAuthn flows expect you to be able to uniquely identify the user that
 * performs registration or authentication. The user ID you specify here should be your internal,
 * _unique_ ID for that user (uuid, etc...). Avoid using identifying information here, like email
 * addresses, as it may be stored within the authenticator.
 *
 * Here, the example server assumes the following user has completed login:
 */


let loggedInUserId = 'internalUserId';

/*let inMemoryUserDeviceDB: { [loggedInUserId: string]: LoggedInUser } = {
  [loggedInUserId]: {
    id: loggedInUserId,
    username: `user@${rpID}`,
    devices: [],
  },
};*/

import mysql from 'mysql2';

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  con.query("CREATE DATABASE IF NOT EXISTS mydb", function (err, result) {
    if (err) throw err;
    console.log("Database created");
  });
  con.query("USE mydb", function (err, result) {
    if (err) throw err;
    console.log("USE mydb");
  });
  var sql = "CREATE TABLE IF NOT EXISTS `inMemoryUserDeviceDB` (id VARCHAR(255) NOT NULL PRIMARY KEY, username VARCHAR(255), devices JSON)";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  });
});

/*app.get('/storeloggedInUserId', (req, res) => {
  const user = inMemoryUserDeviceDB[loggedInUserId];
  con.connect(function(err) {
    var sql = "INSERT INTO `inMemoryUserDeviceDB` (`id`, `username`, `devices`) VALUES ?";
    const value = [[user.id,user.username,JSON.stringify(user.devices)]];
    con.query(sql, [value], function (err, result) {
      if (err) throw err;
    console.log("Record Inserted");
    });
  });
  console.log(user);
  res.send(user);
});*/

/**
 * Registration (a.k.a. "Registration")
 */

/*app.post('/testuser', (req, res) => {
  loggedInUserId = req.body.username;
  if (inMemoryUserDeviceDB[loggedInUserId]) {
    inMemoryUserDeviceDB[loggedInUserId].id = loggedInUserId;
    inMemoryUserDeviceDB[loggedInUserId].username = `${loggedInUserId}@${rpID}`;
    inMemoryUserDeviceDB[loggedInUserId].devices = [];
  }
});*/

app.post('/generate-registration-options', async (req, res) => {
  loggedInUserId = req.body.username;
  let dbres : LoggedInUser = JSON.parse(await selectcredfrondb(loggedInUserId))[0];
  let user : LoggedInUser= {
    id: loggedInUserId,
    username: `${loggedInUserId}@${rpID}`,
    devices: [],
  };
  if(dbres){
    for (let dev of dbres.devices){
      user.devices.push({
        credentialID: new Uint8Array(Object.values(dev.credentialID)),
        credentialPublicKey: new Uint8Array(Object.values(dev.credentialPublicKey)),
        counter: dev.counter,
        transports : dev.transports
      })
    }
  }

  const {
    /**
     * The username can be a human-readable name, email, etc... as it is intended only for display.
     */
    username,
    devices,
  } = user;

  const opts: GenerateRegistrationOptionsOpts = {
    rpName: 'SimpleWebAuthn Example',
    rpID,
    userID: loggedInUserId,
    userName: username,
    timeout: 60000,
    attestationType: 'none',
    /**
     * Passing in a user's list of already-registered authenticator IDs here prevents users from
     * registering the same device multiple times. The authenticator will simply throw an error in
     * the browser if it's asked to perform registration when one of these ID's already resides
     * on it.
     */
    excludeCredentials: devices.map(dev => ({
      id: dev.credentialID,
      type: 'public-key',
      transports: dev.transports,
    })),
    authenticatorSelection: {
      requireResidentKey: true,
    },
    /**
     * Support the two most common algorithms: ES256, and RS256
     */
    supportedAlgorithmIDs: [-7, -257],
  };

  const options = generateRegistrationOptions(opts);

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  req.session.currentChallenge = options.challenge;
  var sql = "INSERT INTO `inMemoryUserDeviceDB` (`id`, `username`, `devices`) VALUES (?,?,?) ON DUPLICATE KEY UPDATE `devices` = ?";
  const value = [user.id,user.username,JSON.stringify(user.devices),JSON.stringify(user.devices)];
  con.query(sql, value, function (err, result) {
    if (err) throw err;
    console.log("User Inserted");
  });
  res.send(options);
});

app.post('/verify-registration', async (req, res) => {
  const body: RegistrationResponseJSON = req.body;
  let dbres : LoggedInUser = JSON.parse(await selectcredfrondb(loggedInUserId))[0];
  let user : LoggedInUser= {
    id : dbres.id,
    username : dbres.username,
    devices: []
  }
  for (let dev of dbres.devices){
    user.devices.push({
      credentialID: new Uint8Array(Object.values(dev.credentialID)),
      credentialPublicKey: new Uint8Array(Object.values(dev.credentialPublicKey)),
      counter: dev.counter,
      transports : dev.transports
    })
  }
  //console.log(inMemoryUserDeviceDB);
  const expectedChallenge = req.session.currentChallenge;

  let verification: VerifiedRegistrationResponse;
  try {
    const opts: VerifyRegistrationResponseOpts = {
      response: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    };
    verification = await verifyRegistrationResponse(opts);
  } catch (error) {
    const _error = error as Error;
    console.error(_error);
    return res.status(400).send({ error: _error.message });
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    const existingDevice = user.devices.find(device => isoUint8Array.areEqual(device.credentialID, credentialID));

    if (!existingDevice) {
      /**
       * Add the returned device to the user's list of devices
       */
      const newDevice: AuthenticatorDevice = {
        credentialPublicKey,
        credentialID,
        counter,
        transports: body.response.transports,
      };
      user.devices.push(newDevice);
    }
    var sql = "UPDATE inMemoryUserDeviceDB SET devices = ? WHERE id = ?";
    const value = [JSON.stringify(user.devices),user.id];
    con.query(sql, value, function (err, result) {
      if (err) throw err;
      console.log("devices Inserted");
    });
  }
  req.session.currentChallenge = undefined;
  //console.log(inMemoryUserDeviceDB);
  res.send({ verified });
});

/**
 * Login (a.k.a. "Authentication")
 */
app.get('/generate-authentication-options', (req, res) => {
  // You need to know the user by this point
  //const user = inMemoryUserDeviceDB[loggedInUserId];

  const opts: GenerateAuthenticationOptionsOpts = {
    timeout: 60000,
    allowCredentials: [],
    /*allowCredentials: user.devices.map(dev => ({
      id: dev.credentialID,
      type: 'public-key',
      transports: dev.transports,
    })),*/
    userVerification: 'required',
    rpID,
  };

  const options = generateAuthenticationOptions(opts);

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  req.session.currentChallenge = options.challenge;
  //console.log(options);

  res.send(options);
});

app.post('/verify-authentication',async (req, res) => {
  const body: AuthenticationResponseJSON = req.body;

  
  let dbres : LoggedInUser = JSON.parse(await selectcredfrondb(body.response.userHandle))[0];
  
  if(JSON.stringify(dbres)=='{}'){
    return res.status(400).send({ error: 'User is not registered with this site' });
  };
  //const user = dbres;
  let user : LoggedInUser= {
    id : dbres.id,
    username : dbres.username,
    devices: []
  }
  for (let dev of dbres.devices){
    user.devices.push({
      credentialID: new Uint8Array(Object.values(dev.credentialID)),
      credentialPublicKey: new Uint8Array(Object.values(dev.credentialPublicKey)),
      counter: dev.counter,
      transports : dev.transports
    })
  }
  //console.log(user);
  //console.log(new Uint8Array(Object.values(user.devices[0].credentialID)));

  const expectedChallenge = req.session.currentChallenge;

  let dbAuthenticator;
  const bodyCredIDBuffer = isoBase64URL.toBuffer(body.rawId);
  //console.log(bodyCredIDBuffer);
  // "Query the DB" here for an authenticator matching `credentialID`
  for (const dev of user.devices) {
    if (isoUint8Array.areEqual(dev.credentialID, bodyCredIDBuffer)) {
      dbAuthenticator = dev;
      break;
    }
  }

  if (!dbAuthenticator) {
    return res.status(400).send({ error: 'Authenticator is not registered with this site' });
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    const opts: VerifyAuthenticationResponseOpts = {
      response: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
      authenticator: dbAuthenticator
    };
    verification = await verifyAuthenticationResponse(opts);
  } catch (error) {
    const _error = error as Error;
    console.error(_error);
    return res.status(400).send({ error: _error.message });
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update the authenticator's counter in the DB to the newest count in the authentication
    dbAuthenticator.counter = authenticationInfo.newCounter;
    var sql = "UPDATE inMemoryUserDeviceDB SET devices = ? WHERE id = ?";
    const value = [JSON.stringify(user.devices),user.id];
    con.query(sql, value, function (err, result) {
      if (err) throw err;
      console.log("devices Inserted");
    });
  }

  req.session.currentChallenge = undefined;

  res.send({ verified });
});

let selectcredfrondb = (value? : string) =>{
  return new Promise<string>((resolve, reject)=>{
    con.query("SELECT * FROM inMemoryUserDeviceDB WHERE id = ? LIMIT 1", value ,(error, result)=>{
      if(error){
        return reject(error);
      }
      return resolve(JSON.stringify(result));
    });
  });
};

if (ENABLE_HTTPS) {
  const host = '0.0.0.0';
  const port = 443;
  expectedOrigin = `https://${rpID}`;

  https
    .createServer(
      {
        /**
         * See the README on how to generate this SSL cert and key pair using mkcert
         */
        key: fs.readFileSync(`./${rpID}.key`),
        cert: fs.readFileSync(`./${rpID}.crt`),
      },
      app,
    )
    .listen(port, host, () => {
      console.log(`🚀 Server ready at ${expectedOrigin} (${host}:${port})`);
    });
} else {
  const host = '127.0.0.1';
  const port = 8000;
  expectedOrigin = `http://localhost:${port}`;

  http.createServer(app).listen(port, host, () => {
    console.log(`🚀 Server ready at ${expectedOrigin} (${host}:${port})`);
  });
}
