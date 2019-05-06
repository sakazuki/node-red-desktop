#!/bin/bash

# From https://github.com/thojansen/client-certificates/blob/master/ssl/setup.sh
# create rootCA certificate
SUBJECT="${SUBJECT}"

openssl genrsa -out rootCA.key 2048
openssl req -x509 -new -nodes -key rootCA.key -days 1024 -out rootCA.crt -subj "${SUBJECT}/CN=rootCA"

# create server key and certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "${SUBJECT}/CN=localhost"
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out server.crt -days 73000

# create client key and certificate
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "${SUBJECT}/CN=client"
openssl x509 -req -in client.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out client.crt -days 73000

# generate client.p12 file which can be easily imported to OS.
openssl pkcs12 -export -inkey client.key -in client.crt -name client -out client.p12

# generate a non-encrypt pem file with key and crt files, from p12 files
#openssl pkcs12 -in client.p12 -out client.pem -nodes -clcerts