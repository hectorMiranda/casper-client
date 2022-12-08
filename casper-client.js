const { KMS } = require("aws-sdk");
const { encodeBase64, decodeBase64 } = require('tweetnacl-util');
const readline = require('readline');
const dotenv = require('dotenv');
dotenv.config();
console.clear();

const kms = new KMS({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.KMS_REGION,
  apiVersion: '2014-11-01',
});

const keyId = process.env.KMS_FROM_KEY_ID;
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Keys, CasperClient, CLPublicKey, DeployUtil } = require("casper-js-sdk");
const RPC_API = "https://rpc.testnet.casperlabs.io/rpc";
const STATUS_API = "http://52.3.38.81:8888/status";
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log([
  '1. Send transfer with local secrets',
  '2. Send transfer with cloud secrets',
  '3. Get cloud public key',
  '4. Get account from cloud',
  '5. Sign deploy with cloud',
  '6. Get transfer body',
  '0. Quit',
].join('\n'));

rl.question('# ', (answer) => {
  switch (answer) {
    case '1':
      sendTransferWithLocalSecrets({
        from: process.env.FROM_LOCAL_SECRET,
        to: process.env.TO_LOCAL_SECRET,
        amount: 2500000000,
      });
      rl.close();
      break;
    case '2':
      sendTransferWithCloudSecrets({
        from: process.env.FROM_LOCAL_SECRET,
        to: process.env.TO_LOCAL_SECRET,
        amount: 2490000000,
      });
      rl.close();
      break;
    case '3':
      getPublicKeyFromCloud();
      rl.close();
      break;
    case '4':
      getAccountFromCloud();
      rl.close();
      break;
    case '5':
        console.log(sign());
        rl.close();
        break;
    case '6':
      getTransferBody({
        from: process.env.FROM_LOCAL_SECRET,
        to: process.env.TO_LOCAL_SECRET,
        amount: 2490000000,
      });
      rl.close();
        break;
  default:
      rl.close();
      break;
  }
});


const sign = async () => {
  const casperClient = new CasperClient(RPC_API);
  var hex_base64_pub_key= null;
  var pubKey = null;
  var deployParams = null;
  var session = null;
  var payment = null;
  var deploy = null;


  var response = kms.getPublicKey({KeyId: process.env.KMS_FROM_KEY_ID}, function (err, data){
    if (err) console.log(err, err.stack);
    else {      
      hex_base64_pub_key = Buffer.from(data.PublicKey).toString('base64');
      console.log(`FROM pub key: ${hex_base64_pub_key}`);
      pubKey= Keys.Secp256K1.parsePublicKey(Buffer.from(data.PublicKey));      
      deployParams = new DeployUtil.DeployParams(pubKey, 'casper-test', 1, 1800000);
      console.log('Deploy Params:'); 
      console.log(deployParams);
      console.log('Session');

      //casperPublicKey = CLPublicKey.fromHex(hex_base64_pub_key);
      casperPublicKey = CLPublicKey.fromHex(process.env.FROM_LOCAL_SECRET);
      console.log('casperPublicKey');
      console.log(casperPublicKey);
      session = DeployUtil.ExecutableDeployItem.newTransfer(2500000000, process.env.TO_LOCAL_SECRET, null, 187821); //CL type? casperPublicKey?
      console.log('Session');
      console.log(session);
      console.log('payment');
      payment = DeployUtil.standardPayment(100000000);
      console.log(payment);
      console.log('Deploy');
      deploy = DeployUtil.makeDeploy(deployParams, session, payment);      
      console.log(deploy);

      let res = kms.sign({
        Message: Buffer.from(deploy),
        KeyId: keyId,
        SigningAlgorithm: 'ECC_SECG_P256K1',
        MessageType: 'RAW'
      }).promise()

      console.log(`Signature: ${res.Signature.toString("base64")}`);

    }
  });

}


const getPublicKeyFromCloud = async () => {
  var response = kms.getPublicKey({
    KeyId: '67839aca-2a51-4bb5-8323-0774ecc989f4'
  }, function (err, data) {
    if (err) console.log(err, err.stack);
    else {
      console.log(data.PublicKey);
      console.log(data);
    }
  });
}

const getAccountFromCloud = async () => {
  var public_key=null;
  
  kms.getPublicKey({
    KeyId: process.env.KMS_FROM_KEY_ID
  }, function (err, data) {
    if (err) console.log(err, err.stack);
    else {
      public_key = data.PublicKey; //DER-encoded X.509 public key, also known as SubjectPublicKeyInfo (SPKI), as defined in RFC 5280. When you use the HTTP API or the AWS CLI, the value is Base64-encoded. 

      //var pubkey = Keys.Secp256K1.parsePublicKey(data.PublicKey);

      //console.log(pubkey.toHex);

      //console.log('02' + encodeBase16(pubkey))
      //encodeBase16 equivalent
      //var hex_string = '02' + Buffer.from(data.PublicKey).toString('hex');

      var hex_base64 = Buffer.from(data.PublicKey).toString('base64');

      console.log(hex_base64);

      var pubKey= Keys.Secp256K1.parsePublicKey(Buffer.from(data.PublicKey));

      console.log(pubKey);
      console.log(typeof pubKey);
      console.log(pubKey.toString('hex'));
      // const clPublicKey = CLPublicKey.fromHex(pubKey);
      // console.log(clPublicKey);

      //console(`isSecp256k1 ${pubKey.isSecp256K1()}`);

    }
  });
 
}








const getTransferBody = async ({ from, to, amount }) => {
  
  const casperClient = new CasperClient(RPC_API);
  const folder = path.join("./", "keys/secp256k1-from-keys");

  const signKeyPair = Keys.Secp256K1.parseKeyFiles(folder + "/" + from + "-public_key.pem", folder + "/" + from + "-secret_key.pem");
  
  const response = await axios.get(STATUS_API + "/status");

  let networkName = null;
  let apiVersion = null;
  let startingStateRootHash = null;


  if (response.status == 200) {
    networkName = response.data.chainspec_name;
    apiVersion = response.data.api_version;
    startingStateRootHash = response.data.starting_state_root_hash;
  }

  console.log(`Network: ${networkName}`);
  console.log(`API Version: ${apiVersion}`);
  console.log(`Starting state root hash: ${startingStateRootHash}`);


  const paymentAmount = 100000000;
  const id = 187821;
  const gasPrice = 1;
  const ttl = 1800000;

  let deployParams = new DeployUtil.DeployParams(signKeyPair.publicKey, networkName, gasPrice, ttl);

  console.log(`Is Public key Secp256K1? ${signKeyPair.publicKey.isSecp256K1()}`);
  console.log("Public key hex " + signKeyPair.publicKey.toHex());
  console.log("Public key str " + signKeyPair.publicKey.toAccountHashStr());

  const toPublicKey = CLPublicKey.fromHex(to);

  const session = DeployUtil.ExecutableDeployItem.newTransfer(amount, toPublicKey, null, id);

  const payment = DeployUtil.standardPayment(paymentAmount);
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  console.log (`deploy`);
  console.log (deploy);

  console.log (`writting file`);

  var json = JSON.stringify(deploy);

  fs.writeFile('/casper/WeCashUp/aws/contracts/deploy.cspr', Buffer.from(json), (err) => {
    if (err) throw err;
  })
  console.log (`done writting`);




  console.log(`Signature`);
  
  kms.sign({
    Message: deploy,//Buffer.from(deploy),
    KeyId: keyId,
    SigningAlgorithm: 'ECC_SECG_P256K1',
    MessageType: 'RAW'
  }, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else     console.log(data);           // successful response
       /*
       data = {
        KeyId: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", // The key ARN of the asymmetric KMS key that was used to sign the message.
        Signature: <Binary String>, // The digital signature of the message.
        SigningAlgorithm: "ECDSA_SHA_384"// The actual signing algorithm that was used to generate the signature.
       }
       */
     });

  // console.log(res.data);


  // var params = {
  //   KeyId: keyId, // The asymmetric KMS key to be used to generate the digital signature. This example uses an alias of the KMS key.
  //   Message: deploy, // Message to be signed. Use Base-64 for the CLI.
  //   MessageType: 'RAW', // Indicates whether the message is RAW or a DIGEST.
  //   SigningAlgorithm: 'ECC_SECG_P256K1'// The requested signing algorithm. This must be an algorithm that the KMS key supports.
  //  };
   
  // kms.sign(params, function(err, data) {
  //    if (err) console.log(err, err.stack); // an error occurred
  //    else     console.log(data);           // successful response
  //    /*
  //    data = {
  //     KeyId: "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab", // The key ARN of the asymmetric KMS key that was used to sign the message.
  //     Signature: <Binary String>, // The digital signature of the message.
  //     SigningAlgorithm: "ECDSA_SHA_384"// The actual signing algorithm that was used to generate the signature.
  //    }
  //    */
  //  });






//  const signedDeploy = DeployUtil.signDeploy(deploy, signKeyPair);

  // console.log("putting deploy....")

  // let deployResult = await casperClient.putDeploy(signedDeploy);

  // console.log("result: " + deployResult);

  // return deployResult;
};



const sendTransferWithLocalSecrets = async ({ from, to, amount }) => {
  
  const casperClient = new CasperClient(RPC_API);
  const folder = path.join("./", "keys/secp256k1-from-keys");

  const signKeyPair = Keys.Secp256K1.parseKeyFiles(folder + "/" + from + "-public_key.pem", folder + "/" + from + "-secret_key.pem");
  
  const response = await axios.get(STATUS_API + "/status");

  let networkName = null;
  let apiVersion = null;
  let startingStateRootHash = null;

  if (response.status == 200) {
    networkName = response.data.chainspec_name;
    apiVersion = response.data.api_version;
    startingStateRootHash = response.data.starting_state_root_hash;
  }

  console.log(`Network: ${networkName}`);
  console.log(`API Version: ${apiVersion}`);
  console.log(`Starting state root hash: ${startingStateRootHash}`);


  const paymentAmount = 100000000;
  const id = 187821;
  const gasPrice = 1;
  const ttl = 1800000;

  let deployParams = new DeployUtil.DeployParams(signKeyPair.publicKey, networkName, gasPrice, ttl);

  console.log(`Is Public key Secp256K1? ${signKeyPair.publicKey.isSecp256K1()}`);
  console.log("Public key hex " + signKeyPair.publicKey.toHex());
  console.log("Public key str " + signKeyPair.publicKey.toAccountHashStr());

  const toPublicKey = CLPublicKey.fromHex(to);

  const session = DeployUtil.ExecutableDeployItem.newTransfer(amount, toPublicKey, null, id);

  const payment = DeployUtil.standardPayment(paymentAmount);
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  console.log (`deploy`);
  console.log (deploy);

  const signedDeploy = DeployUtil.signDeploy(deploy, signKeyPair);

  console.log("putting deploy....")

  let deployResult = await casperClient.putDeploy(signedDeploy);

  console.log("result: " + deployResult);

  return deployResult;
};



const sendTransferWithCloudSecrets = async ({ from, to, amount }) => {
  const casperClient = new CasperClient(RPC_API);
  const folder = path.join("./", "keys/secp256k1-from-keys");

  const signKeyPair = Keys.Secp256K1.parseKeyFiles(folder + "/" + from + "-public_key.pem", folder + "/" + from + "-secret_key.pem");

  const response = await axios.get(STATUS_API + "/status");

  let networkName = null;
  let apiVersion = null;
  let startingStateRootHash = null;

  if (response.status == 200) {
    networkName = response.data.chainspec_name;
    apiVersion = response.data.api_version;
    startingStateRootHash = response.data.starting_state_root_hash;
  }

  console.log(`Network: ${networkName}`);
  console.log(`API Version: ${apiVersion}`);
  console.log(`Starting state root hash: ${startingStateRootHash}`);


  const paymentAmount = 100000000;
  const id = 187821;
  const gasPrice = 1;
  const ttl = 1800000;

  let deployParams = new DeployUtil.DeployParams(signKeyPair.publicKey, networkName, gasPrice, ttl);

  console.log(`Is Public key Secp256K1? ${signKeyPair.publicKey.isSecp256K1()}`);
  console.log("Public key hex " + signKeyPair.publicKey.toHex());
  console.log("Public key str " + signKeyPair.publicKey.toAccountHashStr());

  const toPublicKey = CLPublicKey.fromHex(to);

  const session = DeployUtil.ExecutableDeployItem.newTransfer(amount, toPublicKey, null, id);

  const payment = DeployUtil.standardPayment(paymentAmount);
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  const signedDeploy = DeployUtil.signDeploy(deploy, signKeyPair);

  console.log("putting deploy....")

  let deployResult = await casperClient.putDeploy(signedDeploy);

  console.log("result: " + deployResult);

  return deployResult;
};

