# casper-client
A project to interact with the casper network and AWS KMS 

# Content
- Bash folder: Some bash scripts to interact with AWS KMS  
    - get-account-hash: returns the account hash, expect a pub file location as param.
    - get-from-public-key: create a from-public-key.pub file that can be used to produce the account hash for the FROM account.
    - get-to-public-key: create a to-public-key.pub file that can be used to produce the account hash for the TO account.

- contracts folder: Sample contracts and deploy outputs
- casper-client.js: a nodejs app that uses the casper-js-sdk and the aws-sdk


# Setting up 

create a .env file and set the following values:

```
AWS_ACCESS_KEY_ID=your-key
SECRET_ACCESS_KEY=your-secret
KMS_REGION=us-the-region-where-you-created-your-key-in
KMS_FROM_KEY_ID=key-id-to-be-used-as-the-TO-address
FROM_LOCAL_SECRET=from-local-secret-hex-value
TO_LOCAL_SECRET=to-local-secret-hex-value
```


Use aws configure to use the AWS CLI scripts 

```
aws configure
```


# Run the javascript client

Make sure to install all the dependencies

```
npm install
```

To execute the javascript client use

```
node casper-client.js
```